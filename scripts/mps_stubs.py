import json, sys, os

os.makedirs("_mps", exist_ok=True)

for tier, path in [("free", sys.argv[1]), ("premium", sys.argv[2])]:
    for m in json.load(open(path))["modules"]:
        out = f"_mps/{m['slug'].lower()}.md"
        if os.path.exists(out):
            continue
        tags = ", ".join(m["tags"])
        open(out, "w").write(f"""---
title: {m['name']}
tier: {tier}
tags: [{tags}]
tagline: "{m['description']}"
sitemap: false
robots: noindex
---

## Overview

## Controls

## Inputs

## Outputs

## Tips
""")
