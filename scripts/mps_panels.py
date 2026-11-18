"""Render MPS module panels (with components) for the site, from the plugin C++.

A thin wrapper around mps-core's tools/mps_render_layout.py. Which modules come from
each plugin is read from that plugin's plugin.json, the same source of truth that
scripts/mps_stubs.py uses.

usage:
  python3 scripts/mps_panels.py --list
  python3 scripts/mps_panels.py deathvalley                 # one module
  python3 scripts/mps_panels.py deathvalley olympic         # several
  python3 scripts/mps_panels.py --all                       # every module, both tiers
  python3 scripts/mps_panels.py --all --tier premium
  python3 scripts/mps_panels.py yellowstone --theme both --json
  python3 scripts/mps_panels.py deathvalley --labels --markers --out /tmp/check

Modules are matched by slug, case-insensitive (deathvalley, DeathValley).

options:
  --free PATH / --premium PATH   plugin repos (default ~/MPS/ModularParkService{Free,Premium})
  --theme light|dark|both        default both
  --out DIR                      default assets/mps/panels  -> <slug>-<theme>.<ext>
  --format png|webp              default png
  --json                         also write layouts to _data/mps_layouts/<slug>.json
  --labels / --markers           debug overlays (enum IDs / coordinate crosshairs)

needs: pillow and cairosvg (or rsvg-convert) in the Python you run this with.
"""
import argparse, json, subprocess, sys, tempfile
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
TOOL = Path("src/core/tools/mps_render_layout.py")
TIERS = {"free": "ModularParkServiceFree", "premium": "ModularParkServicePremium"}


def modules_of(root: Path):
    return [m["slug"] for m in json.load(open(root / "plugin.json"))["modules"]]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("modules", nargs="*")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--tier", choices=["free", "premium", "both"], default="both")
    ap.add_argument("--free", type=Path, default=Path.home() / "MPS" / TIERS["free"])
    ap.add_argument("--premium", type=Path, default=Path.home() / "MPS" / TIERS["premium"])
    ap.add_argument("--theme", choices=["light", "dark", "both"], default="both")
    ap.add_argument("--out", type=Path, default=SITE / "assets" / "mps" / "panels")
    ap.add_argument("--format", choices=["png", "webp"], default="png")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--labels", action="store_true")
    ap.add_argument("--markers", action="store_true")
    a = ap.parse_args()

    roots = {"free": a.free.expanduser(), "premium": a.premium.expanduser()}
    tiers = ["free", "premium"] if a.tier == "both" else [a.tier]
    available = {}                              # lowercase slug -> (tier, slug)
    for t in tiers:
        if not (roots[t] / "plugin.json").exists():
            sys.exit(f"{roots[t]}/plugin.json not found (use --{t} PATH)")
        for s in modules_of(roots[t]):
            available[s.lower()] = (t, s)

    if a.list:
        for t in tiers:
            tool_ok = (roots[t] / TOOL).exists()
            print(f"{t}  ({roots[t]})  renderer: {'ok' if tool_ok else 'MISSING, update the src/core submodule'}")
            print("   " + ", ".join(s for _, s in available.values() if _ == t))
        return

    if a.all:
        picked = list(available.values())
    elif a.modules:
        bad = [m for m in a.modules if m.lower() not in available]
        if bad:
            sys.exit(f"unknown module(s): {', '.join(bad)}  (see --list)")
        picked = [available[m.lower()] for m in a.modules]
    else:
        sys.exit("name one or more modules, or use --all (see --list)")

    a.out.mkdir(parents=True, exist_ok=True)
    for t in tiers:
        slugs = [s for tt, s in picked if tt == t]
        if not slugs:
            continue
        tool = roots[t] / TOOL
        if not tool.exists():
            sys.exit(f"{tool} not found: run `git submodule update --remote src/core` in {roots[t]}")
        with tempfile.TemporaryDirectory() as tmp:
            cmd = [sys.executable, str(tool), str(roots[t]), *slugs, "-o", tmp, "--theme", a.theme]
            cmd += [f for f, on in (("--json", a.json), ("--labels", a.labels), ("--markers", a.markers)) if on]
            if subprocess.run(cmd).returncode:
                sys.exit(f"renderer failed for {t}")
            for f in sorted(Path(tmp).iterdir()):
                if f.suffix == ".json":
                    dest = SITE / "_data" / "mps_layouts" / (f.stem.lower() + ".json")
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    dest.write_bytes(f.read_bytes())
                    print(f"data   {dest.relative_to(SITE)}")
                    continue
                stem = f.stem.lower()           # DeathValley-light -> deathvalley-light
                dest = a.out / f"{stem}.{a.format}"
                if a.format == "webp":
                    from PIL import Image
                    Image.open(f).save(dest, "WEBP", quality=90, method=6)
                else:
                    dest.write_bytes(f.read_bytes())
                try:
                    shown = dest.relative_to(SITE)
                except ValueError:
                    shown = dest
                print(f"panel  {shown}")


if __name__ == "__main__":
    main()
