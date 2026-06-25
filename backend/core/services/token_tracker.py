"""
Token tracking service.

Records every LLM call's token usage to outputs/runs/{run_id}/token_usage.json.
Provides run-level and all-time summaries for the /analytics page.

Pricing sources (both fetched live, cached for 6h):
  - LLM costs:     https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json
  - Exchange rate: https://api.exchangerate-api.com/v4/latest/USD

Usage (from any orchestrator node):
    from core.services.token_tracker import token_tracker
    token_tracker.record(run_id="abc", stage="research", model="claude-sonnet-4-5",
                         input_tokens=1200, output_tokens=800)
"""

import json
import threading
import time
import urllib.request
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

from configs.settings import get_settings
from infra.logging import get_logger

logger = get_logger(__name__)
_settings = get_settings()
_BACKEND_ROOT = Path(__file__).parents[2]
_OUTPUTS_ROOT = _BACKEND_ROOT / _settings.content_output_dir

_EXCHANGE_RATE_URL = "https://api.exchangerate-api.com/v4/latest/USD"
_LLM_PRICING_URL = (
    "https://raw.githubusercontent.com/BerriAI/litellm/main"
    "/model_prices_and_context_window.json"
)

# Cache TTL: 6 hours. Keeps costs accurate without hammering free APIs.
_CACHE_TTL = 6 * 3600

# Hard-coded fallbacks used when the live fetch fails.
# Per 1M tokens in USD — sourced from Anthropic's public pricing page.
_FALLBACK_PRICING: dict[str, dict[str, float]] = {
    "claude-sonnet-4-5":         {"input": 3.00,  "output": 15.00},
    "claude-haiku-4-5":          {"input": 0.80,  "output": 4.00},
    "claude-haiku-4-5-20251001": {"input": 0.80,  "output": 4.00},
    "claude-opus-4-8":           {"input": 5.00,  "output": 25.00},
    "claude-opus-4-5":           {"input": 5.00,  "output": 25.00},
}
_FALLBACK_USD_TO_INR = 94.65  # last known live rate; replaced on first successful fetch

# Per-run write locks prevent data loss on concurrent LLM completions
_locks: dict[str, threading.Lock] = {}
_locks_guard = threading.Lock()


# ── Live rate / pricing cache ──────────────────────────────────────────────────

class _LiveCache:
    """Thread-safe cache for exchange rate and LLM pricing. Refreshes every 6h."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._usd_to_inr: float = _FALLBACK_USD_TO_INR
        # Per-model pricing in USD per 1M tokens: {"model": {"input": x, "output": y}}
        self._pricing: dict[str, dict[str, float]] = dict(_FALLBACK_PRICING)
        self._last_refreshed: float = 0.0  # 0 means never refreshed → _is_stale() is always True on first call

    def _is_stale(self) -> bool:
        return (time.monotonic() - self._last_refreshed) > _CACHE_TTL

    def refresh(self) -> None:
        """Fetch both APIs. Silently keeps old values on any failure."""
        usd_to_inr = self._fetch_exchange_rate()
        pricing = self._fetch_llm_pricing()
        with self._lock:
            if usd_to_inr is not None:
                self._usd_to_inr = usd_to_inr
            if pricing:
                self._pricing = pricing
            self._last_refreshed = time.monotonic()

    def get_usd_to_inr(self) -> float:
        if self._is_stale():
            self.refresh()
        with self._lock:
            return self._usd_to_inr

    def get_pricing(self, model: str) -> dict[str, float]:
        if self._is_stale():
            self.refresh()
        with self._lock:
            return self._pricing.get(model) or self._pricing.get(
                # Try stripping provider prefix: "anthropic.claude-x" → "claude-x"
                model.split(".", 1)[-1] if "." in model else model,
                _FALLBACK_PRICING.get("claude-sonnet-4-5", {"input": 3.00, "output": 15.00}),
            )

    @staticmethod
    def _fetch_exchange_rate() -> float | None:
        try:
            with urllib.request.urlopen(_EXCHANGE_RATE_URL, timeout=5) as resp:
                data = json.loads(resp.read())
                rate = float(data["rates"]["INR"])
                logger.info("exchange_rate_refreshed", usd_to_inr=rate)
                return rate
        except Exception as e:
            logger.warning("exchange_rate_fetch_failed", error=str(e))
            return None

    @staticmethod
    def _fetch_llm_pricing() -> dict[str, dict[str, float]] | None:
        """
        Parse LiteLLM's community-maintained pricing JSON.
        Prices are stored per-token; we convert to per-1M for consistency.
        Only Claude models are extracted.
        """
        try:
            with urllib.request.urlopen(_LLM_PRICING_URL, timeout=8) as resp:
                raw: dict = json.loads(resp.read())
        except Exception as e:
            logger.warning("llm_pricing_fetch_failed", error=str(e))
            return None

        pricing: dict[str, dict[str, float]] = {}
        for name, meta in raw.items():
            if not isinstance(meta, dict):
                continue
            input_per_token = meta.get("input_cost_per_token")
            output_per_token = meta.get("output_cost_per_token")
            if input_per_token is None or output_per_token is None:
                continue

            # Normalise to per-1M tokens
            entry = {
                "input": round(float(input_per_token) * 1_000_000, 4),
                "output": round(float(output_per_token) * 1_000_000, 4),
            }

            # Keep both the full name and a short alias (strip "anthropic." prefix)
            pricing[name] = entry
            short = name.split(".", 1)[-1] if "." in name else None
            if short and short not in pricing:
                pricing[short] = entry

        if pricing:
            logger.info("llm_pricing_refreshed", model_count=len(pricing))
        return pricing or None


_cache = _LiveCache()


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_lock(run_id: str) -> threading.Lock:
    with _locks_guard:
        if run_id not in _locks:
            _locks[run_id] = threading.Lock()
        return _locks[run_id]


@dataclass
class TokenRecord:
    stage: str
    model: str
    input_tokens: int
    output_tokens: int
    cost_usd: float
    cost_inr: float
    timestamp: str


def _compute_cost(model: str, input_tokens: int, output_tokens: int) -> tuple[float, float]:
    pricing = _cache.get_pricing(model)
    usd_to_inr = _cache.get_usd_to_inr()
    cost_usd = (input_tokens * pricing["input"] + output_tokens * pricing["output"]) / 1_000_000
    return round(cost_usd, 6), round(cost_usd * usd_to_inr, 4)


def _aggregate_records(records: list[dict]) -> tuple[dict[str, dict], float, float]:
    """Sum token counts and costs by stage. Returns (by_stage, total_usd, total_inr)."""
    by_stage: dict[str, dict] = {}
    total_usd = total_inr = 0.0
    for r in records:
        s = r["stage"]
        if s not in by_stage:
            by_stage[s] = {"input_tokens": 0, "output_tokens": 0, "cost_usd": 0.0, "cost_inr": 0.0, "calls": 0}
        by_stage[s]["input_tokens"] += r["input_tokens"]
        by_stage[s]["output_tokens"] += r["output_tokens"]
        by_stage[s]["cost_usd"] += r["cost_usd"]
        by_stage[s]["cost_inr"] += r["cost_inr"]
        by_stage[s]["calls"] += 1
        total_usd += r["cost_usd"]
        total_inr += r["cost_inr"]
    return by_stage, total_usd, total_inr


# ── Main class ─────────────────────────────────────────────────────────────────

class TokenTracker:
    def record(self, run_id: str, stage: str, model: str, input_tokens: int, output_tokens: int) -> None:
        if not run_id:
            return
        cost_usd, cost_inr = _compute_cost(model, input_tokens, output_tokens)
        record = TokenRecord(
            stage=stage,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_usd=cost_usd,
            cost_inr=cost_inr,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
        self._append(run_id, record)

    def _append(self, run_id: str, record: TokenRecord) -> None:
        path = _OUTPUTS_ROOT / run_id / "token_usage.json"
        with _get_lock(run_id):
            try:
                path.parent.mkdir(parents=True, exist_ok=True)
                existing: list = json.loads(path.read_text()) if path.exists() else []
                existing.append(asdict(record))
                path.write_text(json.dumps(existing, indent=2))
            except (OSError, json.JSONDecodeError) as e:
                logger.warning("token_tracker_write_error", run_id=run_id, error=str(e))

    def get_run_summary(self, run_id: str) -> dict:
        path = _OUTPUTS_ROOT / run_id / "token_usage.json"
        if not path.exists():
            return {"records": [], "total_input": 0, "total_output": 0,
                    "total_cost_usd": 0.0, "total_cost_inr": 0.0, "by_stage": {}}
        try:
            records: list[dict] = json.loads(path.read_text())
        except (OSError, json.JSONDecodeError) as e:
            logger.warning("token_tracker_read_error", run_id=run_id, error=str(e))
            return {"records": [], "total_input": 0, "total_output": 0,
                    "total_cost_usd": 0.0, "total_cost_inr": 0.0, "by_stage": {}}

        by_stage, total_usd, total_inr = _aggregate_records(records)
        return {
            "records": records,
            "total_input": sum(r["input_tokens"] for r in records),
            "total_output": sum(r["output_tokens"] for r in records),
            "total_cost_usd": round(total_usd, 6),
            "total_cost_inr": round(total_inr, 4),
            "by_stage": by_stage,
        }

    def get_all_time_summary(self) -> dict:
        if not _OUTPUTS_ROOT.exists():
            return {"total_cost_usd": 0.0, "total_cost_inr": 0.0, "by_stage": {}, "total_runs_with_data": 0}

        all_records: list[dict] = []
        runs_with_data: set[str] = set()

        for run_dir in _OUTPUTS_ROOT.iterdir():
            if not run_dir.is_dir():
                continue
            usage_file = run_dir / "token_usage.json"
            if usage_file.exists():
                try:
                    all_records.extend(json.loads(usage_file.read_text()))
                    runs_with_data.add(run_dir.name)
                except (OSError, json.JSONDecodeError):
                    pass

        by_stage, total_usd, total_inr = _aggregate_records(all_records)
        return {
            "total_cost_usd": round(total_usd, 6),
            "total_cost_inr": round(total_inr, 4),
            "by_stage": by_stage,
            "total_runs_with_data": len(runs_with_data),
        }


# Singleton
token_tracker = TokenTracker()
