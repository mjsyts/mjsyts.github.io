#!/usr/bin/env python3
from __future__ import annotations

import subprocess
from pathlib import Path
from datetime import date
import re

ROOT = Path(__file__).resolve().parents[1]
TODAY = date.today().isoformat()

TARGET_DIRS = [ROOT / "_posts", ROOT / "_development", ROOT / "_writing"]

def git_changed_files() -> list[Path]:
    # Compare against previous commit on the branch.
    out = subprocess.check_output(["git", "diff", "--name-only", "HEAD~1..HEAD"], text=True)
    files = [ROOT / line.strip() for line in out.splitlines() if line.strip()]
    return [f for f in files if f.exists()]

def is_target_post(p: Path) -> bool:
    if p.suffix.lower() not in {".md", ".markdown", ".html"}:
        return False
    return any(str(p).startswith(str(d)) for d in TARGET_DIRS if d.exists())

def touch_frontmatter(p: Path) -> bool:
    txt = p.read_text(encoding="utf-8")
    if not txt.startswith("---\n"):
        return False

    # Find the end of frontmatter
    end = txt.find("\n---\n", 4)
    if end == -1:
        return False

    fm = txt[: end + 5]
    body = txt[end + 5 :]

    if "last_modified_at:" in fm:
        fm2 = re.sub(r"^last_modified_at:\s*.*$", f"last_modified_at: {TODAY}", fm, flags=re.M)
    else:
        # Insert near top (after date if present, else right after opening)
        lines = fm.splitlines(True)
        insert_at = 1
        for i, line in enumerate(lines):
            if line.startswith("date:"):
                insert_at = i + 1
                break
        lines.insert(insert_at, f"last_modified_at: {TODAY}\n")
        fm2 = "".join(lines)

    if fm2 != fm:
        p.write_text(fm2 + body, encoding="utf-8")
        return True
    return False

def main() -> None:
    changed = [p for p in git_changed_files() if is_target_post(p)]
    updated = 0
    for p in changed:
        if touch_frontmatter(p):
            updated += 1
            print(f"touched {p}")
    print(f"updated {updated} file(s)")

if __name__ == "__main__":
    main()
