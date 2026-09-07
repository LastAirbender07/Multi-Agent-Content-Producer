#!/usr/bin/env python3
"""
export_specs.py

Parses frontend/constants/templateContentSpecs.ts and extracts
TEMPLATE_CONTENT_SPECS to backend/configs/template_content_specs.json

Run: python3 scripts/export_specs.py
"""
import json, re, sys
from pathlib import Path
from datetime import datetime, timezone

ROOT   = Path(__file__).parent.parent
SRC    = ROOT / "frontend/constants/templateContentSpecs.ts"
DST    = ROOT / "backend/configs/template_content_specs.json"

# Read the TS source
src = SRC.read_text()

# Strip TypeScript-specific syntax so we can eval it as Python
def ts_to_python_value(ts_str):
    """Convert a TypeScript value literal to a Python value."""
    ts_str = ts_str.strip()
    if ts_str == "true":  return True
    if ts_str == "false": return False
    if ts_str == "null":  return None
    # String
    if (ts_str.startswith('"') and ts_str.endswith('"')) or \
       (ts_str.startswith("'") and ts_str.endswith("'")):
        return ts_str[1:-1].replace("\\n", "\n").replace('\\"', '"').replace("\\'", "'")
    # Number
    try: return int(ts_str)
    except ValueError: pass
    try: return float(ts_str)
    except ValueError: pass
    return ts_str

def parse_ts_object(content, pos):
    """Parse a TypeScript object literal starting at pos (the '{') and return (dict, end_pos)."""
    assert content[pos] == '{', f"Expected '{{' at {pos}, got {repr(content[pos])}"
    result = {}
    i = pos + 1
    depth = 1

    while i < len(content) and depth > 0:
        # Skip whitespace and comments
        while i < len(content) and content[i] in ' \t\n\r':
            i += 1
        if i >= len(content): break
        if content[i] == '}':
            depth -= 1
            i += 1
            if depth == 0: break
            continue
        if content[i] == ',':
            i += 1
            continue
        # Parse key
        if content[i] in ('"', "'"):
            q = content[i]
            end_q = content.index(q, i+1)
            key = content[i+1:end_q]
            i = end_q + 1
        else:
            # identifier key
            key_match = re.match(r'(\w+)', content[i:])
            if not key_match: i += 1; continue
            key = key_match.group(1)
            i += len(key)
        # Skip whitespace and colon
        while i < len(content) and content[i] in ' \t\n\r': i += 1
        if i < len(content) and content[i] == ':': i += 1
        while i < len(content) and content[i] in ' \t\n\r': i += 1
        # Parse value
        if i >= len(content): break
        val, i = parse_ts_value(content, i)
        result[key] = val

    return result, i

def parse_ts_array(content, pos):
    """Parse a TypeScript array literal starting at pos (the '[') and return (list, end_pos)."""
    assert content[pos] == '['
    result = []
    i = pos + 1
    while i < len(content):
        while i < len(content) and content[i] in ' \t\n\r': i += 1
        if i >= len(content): break
        if content[i] == ']':
            i += 1
            break
        if content[i] == ',':
            i += 1
            continue
        val, i = parse_ts_value(content, i)
        result.append(val)
    return result, i

def parse_ts_string(content, pos):
    """Parse a quoted string (single, double, or backtick) starting at pos."""
    q = content[pos]
    i = pos + 1
    s = ""
    while i < len(content):
        if content[i] == '\\' and i+1 < len(content):
            esc = content[i+1]
            if esc == 'n': s += '\n'
            elif esc == 't': s += '\t'
            elif esc == '\\': s += '\\'
            elif esc == '"': s += '"'
            elif esc == "'": s += "'"
            else: s += esc
            i += 2
        elif content[i] == q:
            i += 1
            break
        else:
            s += content[i]
            i += 1
    return s, i

def parse_ts_value(content, pos):
    """Parse a TypeScript value at pos and return (value, end_pos)."""
    while pos < len(content) and content[pos] in ' \t\n\r': pos += 1
    if pos >= len(content): return None, pos
    c = content[pos]

    if c == '{':
        return parse_ts_object(content, pos)
    if c == '[':
        return parse_ts_array(content, pos)
    if c in ('"', "'", '`'):
        return parse_ts_string(content, pos)
    # Number
    num_match = re.match(r'-?\d+(?:\.\d+)?', content[pos:])
    if num_match:
        num_str = num_match.group()
        end = pos + len(num_str)
        return (int(num_str) if '.' not in num_str else float(num_str)), end
    # Boolean / null / undefined
    for kw, val in [('true', True), ('false', False), ('null', None), ('undefined', None)]:
        if content[pos:pos+len(kw)] == kw:
            return val, pos + len(kw)
    # Skip to next comma/bracket/brace (unknown token)
    end = pos
    while end < len(content) and content[end] not in ',]}':
        end += 1
    return content[pos:end].strip(), end

# ── Find TEMPLATE_CONTENT_SPECS = [ ... ] ────────────────────────────────────
match = re.search(r'TEMPLATE_CONTENT_SPECS:\s*TemplateContentSpec\[\]\s*=\s*\[', src)
if not match:
    match = re.search(r'TEMPLATE_CONTENT_SPECS\s*=\s*\[', src)
if not match:
    print("❌ Could not find TEMPLATE_CONTENT_SPECS in source", file=sys.stderr)
    sys.exit(1)

array_start = match.end() - 1  # position of '['
specs, _ = parse_ts_array(src, array_start)

if not specs:
    print("❌ Parsed zero specs", file=sys.stderr)
    sys.exit(1)

# Write JSON
DST.parent.mkdir(parents=True, exist_ok=True)
output = {
    "specs": specs,
    "generated_at": datetime.now(timezone.utc).isoformat(),
    "count": len(specs),
}
DST.write_text(json.dumps(output, indent=2, ensure_ascii=False))
print(f"✅ Exported {len(specs)} specs → {DST}")
for s in specs:
    print(f"   {s.get('templateId')} ({s.get('family')} / {s.get('slideRole')})")
