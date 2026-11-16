"""Sync _mps/*.md from each repo's plugin.json (the source of truth).

usage: python3 scripts/mps_stubs.py FREE_plugin.json PREMIUM_plugin.json

plugin.json owns: title, tier, tags, tagline. Those are rewritten on every run.
Everything else in an existing file (hp, panel, order, type, accent, body) is kept.
New modules get a stub.
"""
import json, os, re, sys

os.makedirs("_mps", exist_ok=True)
STUB = "\n## Overview\n\n## Controls\n\n## Inputs\n\n## Outputs\n\n## Tips\n"
OWNED = ["title", "tier", "tags", "tagline"]

def parse(path):
    t = open(path).read()
    m = re.match(r"^---\n(.*?)\n---\n?(.*)$", t, re.S)
    return (m.group(1).split("\n"), m.group(2)) if m else ([], t)

for tier, path in [("free", sys.argv[1]), ("premium", sys.argv[2])]:
    for m in json.load(open(path))["modules"]:
        out = f"_mps/{m['slug'].lower()}.md"
        owned = {
            "title": m["name"],
            "tier": tier,
            "tags": "[" + ", ".join(m["tags"]) + "]",
            "tagline": json.dumps(m["description"], ensure_ascii=False),
        }
        if os.path.exists(out):
            lines, body = parse(out)
            kept = [l for l in lines if l.split(":", 1)[0].strip() not in OWNED]
            action = "updated"
        else:
            kept, body, action = ["sitemap: false", "robots: noindex"], STUB, "created"
        fm = [f"{k}: {owned[k]}" for k in OWNED] + kept
        open(out, "w").write("---\n" + "\n".join(fm) + "\n---\n" + body)
        print(action, out)
