#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

VALID_TYPES = {"视频", "视频笔记", "图文", "图文笔记"}
REQUIRED = (
    "object_name",
    "object_role",
    "spu_name",
    "note_id",
    "note_type",
    "spend_rank",
    "auction_spend",
)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest")
    parser.add_argument("--video-top", type=int, required=True)
    parser.add_argument("--image-top", type=int, required=True)
    args = parser.parse_args()

    rows = json.loads(Path(args.manifest).read_text("utf-8"))
    errors: list[str] = []
    if not isinstance(rows, list):
        errors.append("manifest must be a JSON array")
        rows = []

    ids: list[str] = []
    counts: Counter[str] = Counter()
    for index, row in enumerate(rows, 1):
        if not isinstance(row, dict):
            errors.append(f"row {index}: must be an object")
            continue
        for field in REQUIRED:
            if row.get(field) in (None, ""):
                errors.append(f"row {index}: missing {field}")
        note_id = str(row.get("note_id") or "")
        if note_id:
            ids.append(note_id)
            if len(note_id) != 24:
                errors.append(f"row {index}: note_id must be 24 characters")
        note_type = str(row.get("note_type") or "")
        if note_type not in VALID_TYPES:
            errors.append(f"row {index}: unsupported note_type {note_type!r}")
        else:
            counts["video" if note_type.startswith("视频") else "image"] += 1
        if row.get("time_filter_applied") not in (None, False, ""):
            if not str(row.get("time_filter_reason") or "").strip():
                errors.append(f"row {index}: time filter applied without explicit reason")

    for note_id, count in Counter(ids).items():
        if count > 1:
            errors.append(f"duplicate note_id: {note_id}")
    if counts["video"] > args.video_top:
        errors.append("video rows exceed requested Top N")
    if counts["image"] > args.image_top:
        errors.append("image rows exceed requested Top N")

    report = {
        "rows": len(rows),
        "video_rows": counts["video"],
        "image_rows": counts["image"],
        "passed": not errors,
        "errors": errors,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())

