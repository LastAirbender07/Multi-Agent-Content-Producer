import json
from pathlib import Path


class RunOutputManager:
    """
    Shared utility for saving orchestrator outputs to a consistent folder structure.

    All stages of a pipeline run write under the same root:
        outputs/<run_id>/<stage>/
    """

    def __init__(self, run_id: str, outputs_root: Path):
        self.run_id = run_id
        self.run_root = outputs_root / run_id

    def stage_dir(self, stage: str) -> Path:
        d = self.run_root / stage
        d.mkdir(parents=True, exist_ok=True)
        return d

    def save_json(self, stage: str, filename: str, data: dict) -> Path:
        path = self.stage_dir(stage) / filename
        path.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")
        return path

    def save_markdown(self, stage: str, filename: str, content: str) -> Path:
        path = self.stage_dir(stage) / filename
        path.write_text(content, encoding="utf-8")
        return path

    def save_text(self, stage: str, filename: str, content: str) -> Path:
        path = self.stage_dir(stage) / filename
        path.write_text(content, encoding="utf-8")
        return path
