#!/usr/bin/env python3
from __future__ import annotations

import sys
import re
from pathlib import Path
from datetime import date
import yaml  # installed in the workflow (PyYAML)


ROOT = Path(__file__).resolve().parents[1]
QUEUE = ROOT / "_data" / "notify_queue.yml"

# Adjust to match where DSP posts live in your repo.
POST_DIRS = [
    ROOT / "_posts",
    ROOT / "_development",   # you have this collection per README
]

REQUIRED = ["id", "post", "type", "subject", "excerpt", "audience", "status", "created_at"]
VALID_TYPES = {"new_article", "update", "milestone"}
VALID_AUDIENCE = {"dsp", "sound_design", "both"}
VALID_STATUS = {"queued", "sent"}


def load_frontmatter(text: str) -> dict:
    # Minimal YAML frontmatter parser: expects the standard Jekyll triple-dash block.
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, flags=re.S)
    if not m:
        return {}
    return yaml.safe_load(m.group(1)) or {}


def find_post_by_permalink(target: str) -> Path | None:
    # target like "/development/oscillators/..."
    for d in POST_DIRS:
        if not d.exists():
            continue
        for p in d.rglob("*.*"):
            if p.suffix.lower() not in {".md", ".markdown", ".html"}:
                continue
            fm = load_frontmatter(p.read_text(encoding="utf-8"))
            # Common patterns in your repo: Jekyll collection pages often use permalink.
            permalink = fm.get("permalink")
            if isinstance(permalink, str) and permalink.rstrip("/") == target.rstrip("/"):
                return p
            # Fallback: try to infer from url-ish fields if you use them
            url = fm.get("url")
            if isinstance(url, str) and url.rstrip("/") == target.rstrip("/"):
                return p
    return None


def die(msg: str) -> None:
    print(f"[notify-guard] ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    if not QUEUE.exists():
        die("Missing _data/notify_queue.yml")

    data = yaml.safe_load(QUEUE.read_text(encoding="utf-8")) or []
    if not isinstance(data, list):
        die("notify_queue.yml must be a YAML list")

    ids = []
    queued = [x for x in data if isinstance(x, dict) and x.get("status") == "queued"]

    if len(queued) > 1:
        die(f"More than one queued notification ({len(queued)}). Keep it to 1 to prevent accidents.")

    for item in data:
        if not isinstance(item, dict):
            die("Each notify_queue item must be a mapping/object")

        for k in REQUIRED:
            if k not in item or item[k] in (None, ""):
                die(f"Item missing required field '{k}': {item}")

        if item["type"] not in VALID_TYPES:
            die(f"Invalid type '{item['type']}' for id={item['id']}")

        if item["audience"] not in VALID_AUDIENCE:
            die(f"Invalid audience '{item['audience']}' for id={item['id']}")

        if item["status"] not in VALID_STATUS:
            die(f"Invalid status '{item['status']}' for id={item['id']}")

        ids.append(item["id"])

        # Validate created_at format a bit
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", str(item["created_at"])):
            die(f"created_at must be YYYY-MM-DD for id={item['id']}")

        # If queued, ensure referenced post exists and is published
        if item["status"] == "queued":
            post_path = find_post_by_permalink(item["post"])
            if post_path is None:
                die(f"Queued item id={item['id']} points to post '{item['post']}' that couldn't be found via frontmatter permalink/url")

            fm = load_frontmatter(post_path.read_text(encoding="utf-8"))
            if fm.get("published") is not True:
                die(f"Queued item id={item['id']} points to a post that is not published: {post_path}")

    # Unique id check
    if len(set(ids)) != len(ids):
        die("Duplicate notification 'id' found in notify_queue.yml (this can cause accidental re-sends)")

    print("[notify-guard] OK")


if __name__ == "__main__":
    main()
