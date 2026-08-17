#!/usr/bin/env python3
import argparse
import hashlib
import json
from pathlib import Path


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("report_dir", type=Path)
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    manifest = json.loads((root / "assets/embedded-label-dictionary/manifest.json").read_text())
    source = root / manifest["asset_path"]
    target = args.report_dir / "dictionary"
    required = [
        "index.html",
        "report-theme.css",
        "rules-sync.js",
        "v13-copy-sync.js",
        "rules/latest.json",
        "fonts/huxiaobo-qingniansong-light.otf",
        "fonts/huxiaobo-qingniansong-bold.otf",
    ]

    errors = []
    for rel in required:
        src, dst = source / rel, target / rel
        if not dst.is_file():
            errors.append(f"missing embedded dictionary asset: dictionary/{rel}")
        elif digest(src) != digest(dst):
            errors.append(f"embedded dictionary drift: dictionary/{rel}")

    report = args.report_dir / "index.html"
    if not report.is_file():
        errors.append("missing report index.html")
    elif "dictionary/index.html" not in report.read_text(errors="ignore"):
        errors.append("report has no embedded dictionary entry")

    if errors:
        print("\n".join(errors))
        return 1
    print(f"embedded dictionary OK: {manifest['embedded_dictionary_version']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
