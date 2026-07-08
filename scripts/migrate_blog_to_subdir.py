#!/usr/bin/env python3
"""
One-time migration: move blog_post.{md,html} from run root into blog/ subdirectory.
Safe to re-run — skips runs that already have the blog/ subdir.

Usage:
    python scripts/migrate_blog_to_subdir.py
"""
import re
import shutil
import sys
from pathlib import Path

ROOT     = Path(__file__).parents[1]
RUNS_DIR = ROOT / "backend" / "outputs" / "runs"
UUID_RE  = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
FILENAMES = ["blog_post.md", "blog_post.html"]

if not RUNS_DIR.exists():
    print(f"Runs directory not found: {RUNS_DIR}")
    sys.exit(1)

moved = skipped = already_done = 0
for run_dir in sorted(RUNS_DIR.iterdir()):
    if not run_dir.is_dir() or not UUID_RE.match(run_dir.name):
        continue
    blog_dir      = run_dir / "blog"
    files_to_move = [run_dir / fn for fn in FILENAMES if (run_dir / fn).exists()]

    if blog_dir.exists() and not files_to_move:
        already_done += 1
        continue
    if not files_to_move:
        skipped += 1
        continue

    blog_dir.mkdir(exist_ok=True)
    for f in files_to_move:
        dest = blog_dir / f.name
        shutil.move(str(f), dest)
        print(f"  moved {run_dir.name[:8]}/{f.name} → blog/{f.name}")
    moved += 1

print()
print(f"Moved: {moved}  |  Already done: {already_done}  |  No blog files: {skipped}")
