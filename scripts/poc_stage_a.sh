#!/usr/bin/env bash
# poc_stage_a.sh — Phase 2 Stage A end-to-end POC verifier.
# Runs 8 gates; exits non-zero on the first failure.
# On full success, prints POC_STAGE_A=PASS on the final line.

set -u  # unset variables are errors; do NOT set -e — we handle failures per gate

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

FAIL() {
  local gate="$1"
  local msg="$2"
  echo ""
  echo "❌ Gate ${gate} FAILED: ${msg}"
  echo "POC_STAGE_A=FAIL:gate-${gate}"
  exit "${gate}"
}

PASS() {
  local gate="$1"
  echo "   ✓ Gate ${gate}"
}

echo "════════════════════════════════════════════════════════════════"
echo "  Phase 2 — Stage A POC Verifier"
echo "  Project root: ${PROJECT_ROOT}"
echo "════════════════════════════════════════════════════════════════"

# ── Gate 1: New fonts are real woff2 ──────────────────────────────────────────
echo ""
echo "Gate 1: New fonts are real woff2 (not HTML/404)"
FONT_PF="backend/assets/fonts/PlayfairDisplay-BoldItalic.woff2"
FONT_IN="backend/assets/fonts/Inter-Black.woff2"
if ! file "${FONT_PF}" | grep -q "Web Open Font Format"; then
  FAIL 1 "PlayfairDisplay-BoldItalic.woff2 is not a woff2 — got: $(file "${FONT_PF}")"
fi
if ! file "${FONT_IN}" | grep -q "Web Open Font Format"; then
  FAIL 1 "Inter-Black.woff2 is not a woff2 — got: $(file "${FONT_IN}")"
fi
PASS 1

# ── Gate 2: Font sizes ≥ 10 KB ────────────────────────────────────────────────
echo ""
echo "Gate 2: Font sizes ≥ 10 KB (catches truncated downloads / HTML 404s)"
SIZE_PF=$(stat -f%z "${FONT_PF}" 2>/dev/null || stat -c%s "${FONT_PF}")
SIZE_IN=$(stat -f%z "${FONT_IN}" 2>/dev/null || stat -c%s "${FONT_IN}")
if [ "${SIZE_PF}" -lt 10000 ]; then FAIL 2 "PlayfairDisplay-BoldItalic.woff2 is ${SIZE_PF} bytes (< 10000)"; fi
if [ "${SIZE_IN}" -lt 10000 ]; then FAIL 2 "Inter-Black.woff2 is ${SIZE_IN} bytes (< 10000)"; fi
echo "   Playfair=${SIZE_PF} bytes, Inter=${SIZE_IN} bytes"
PASS 2

# ── Gate 3: Renderer bundle builds ────────────────────────────────────────────
echo ""
echo "Gate 3: Renderer bundle builds with new FONT_DEFS"
if ! (cd backend && node renderer/build.mjs) > /tmp/poc_bundle.log 2>&1; then
  cat /tmp/poc_bundle.log
  FAIL 3 "renderer build.mjs failed — see /tmp/poc_bundle.log"
fi
if [ ! -s backend/renderer/renderer.bundle.js ]; then
  FAIL 3 "renderer.bundle.js is empty or missing"
fi
BUNDLE_SIZE=$(stat -f%z backend/renderer/renderer.bundle.js 2>/dev/null || stat -c%s backend/renderer/renderer.bundle.js)
echo "   renderer.bundle.js = ${BUNDLE_SIZE} bytes"
PASS 3

# ── Gate 4: Frontend tsc --noEmit ─────────────────────────────────────────────
echo ""
echo "Gate 4: Frontend tsc --noEmit clean"
if ! (cd frontend && npx tsc --noEmit) > /tmp/poc_tsc.log 2>&1; then
  tail -20 /tmp/poc_tsc.log
  FAIL 4 "tsc --noEmit reported errors — see /tmp/poc_tsc.log"
fi
PASS 4

# ── Gate 5: COMPACT_TOKENS importable (validated via gate 4 tsc) ──────────────
echo ""
echo "Gate 5: COMPACT_TOKENS importable"
if [ ! -f frontend/utils/canvasTemplates/shared/design_tokens.ts ]; then
  FAIL 5 "design_tokens.ts not found"
fi
if ! grep -q "COMPACT_TOKENS" frontend/utils/canvasTemplates/shared/design_tokens.ts; then
  FAIL 5 "COMPACT_TOKENS not exported from design_tokens.ts"
fi
PASS 5

# ── Gate 6: Fonts load in headless Chromium ───────────────────────────────────
echo ""
echo "Gate 6: Fonts load in headless Chromium"
BE_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "${GAN_BE_URL:-http://localhost:8000}/health" || echo "000")
if [ "${BE_HEALTH}" != "200" ]; then
  FAIL 6 "Backend not reachable at ${GAN_BE_URL:-http://localhost:8000}/health (HTTP ${BE_HEALTH}). Start with: cd backend && uv run uvicorn main:app --port 8000"
fi
if ! node scripts/poc_font_load_check.js > /tmp/poc_fonts.log 2>&1; then
  cat /tmp/poc_fonts.log
  FAIL 6 "font-load check failed"
fi
cat /tmp/poc_fonts.log
if ! grep -q "inter=true" /tmp/poc_fonts.log; then FAIL 6 "Inter did not load"; fi
if ! grep -q "playfair=true" /tmp/poc_fonts.log; then FAIL 6 "Playfair Display did not load"; fi
PASS 6

# ── Gate 7: gan_reference.js --smoke ──────────────────────────────────────────
echo ""
echo "Gate 7: gan_reference.js --smoke end-to-end"
if ! node scripts/gan_reference.js --smoke > /tmp/poc_ganref.log 2>&1; then
  cat /tmp/poc_ganref.log
  FAIL 7 "gan_reference.js --smoke failed"
fi
cat /tmp/poc_ganref.log
if ! grep -q "^smoke_ok=true$" /tmp/poc_ganref.log; then
  FAIL 7 "gan_reference.js did not print smoke_ok=true"
fi
PASS 7

# ── Gate 8: gan_component_snapshots.js --smoke ────────────────────────────────
echo ""
echo "Gate 8: gan_component_snapshots.js --smoke end-to-end"
if ! node scripts/gan_component_snapshots.js --smoke > /tmp/poc_gancomp.log 2>&1; then
  cat /tmp/poc_gancomp.log
  FAIL 8 "gan_component_snapshots.js --smoke failed"
fi
cat /tmp/poc_gancomp.log
if ! grep -q "^smoke_ok=true$" /tmp/poc_gancomp.log; then
  FAIL 8 "gan_component_snapshots.js did not print smoke_ok=true"
fi
PASS 8

# ── Final exit criteria check ─────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  All 8 gates PASSED — verifying on-disk artifacts"
echo "════════════════════════════════════════════════════════════════"
SMOKE_REF_DIR="backend/outputs/gan-runs/smoke/gan_reference"
if [ ! -f "${SMOKE_REF_DIR}/composite_0.png" ]; then FAIL 9 "composite_0.png missing"; fi
if [ ! -f "${SMOKE_REF_DIR}/llm_analysis.json" ]; then FAIL 9 "llm_analysis.json missing"; fi
if ! python3 -c "import json,sys; d=json.load(open('${SMOKE_REF_DIR}/llm_analysis.json')); assert 'issues' in d and 'fixes' in d and 'visual_observations' in d" 2>/dev/null; then
  FAIL 9 "llm_analysis.json missing one of {issues, fixes, visual_observations}"
fi
echo "   ✓ composite_0.png present"
echo "   ✓ llm_analysis.json has required keys"
echo ""
echo "POC_STAGE_A=PASS"
