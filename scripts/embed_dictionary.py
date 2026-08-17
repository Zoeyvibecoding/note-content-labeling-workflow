#!/usr/bin/env python3
import argparse
import json
import shutil
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("report_dir", type=Path)
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    manifest = json.loads((root / "assets/embedded-label-dictionary/manifest.json").read_text())
    source = root / manifest["asset_path"]
    target = args.report_dir / "dictionary"

    if not (args.report_dir / "index.html").is_file():
        raise SystemExit("report index.html must exist before embedding the dictionary")
    if target.exists():
        shutil.rmtree(target)
    shutil.copytree(source, target)
    print(f"embedded dictionary copied: {manifest['embedded_dictionary_version']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
