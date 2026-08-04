#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

LINK = re.compile(r"^https://www\.xiaohongshu\.com/(?:discovery/item|explore)/[0-9a-f]{24}", re.I)
VIDEO_SOURCE = re.compile(r"(?:ASR|花字|字幕|包装|帧|秒|s\b)", re.I)
IMAGE_SOURCE = re.compile(r"(?:Athena正文|图片\s*\d+)", re.I)
FORMULA_ERRORS = re.compile(r"#REF!|#DIV/0!|#VALUE!|#NAME\?|#N/A", re.I)

CONTENT_COMMON = (
    "note_id",
    "note_link",
    "note_type",
    "summary",
)

LABEL_COMMON = (
    "label",
    "label_reason",
    "label_source",
    "rules_version",
    "rules_hash",
    "rules_fetched_at",
)


def text(row: dict, *names: str) -> str:
    for name in names:
        value = row.get(name)
        if value not in (None, ""):
            return str(value).strip()
    return ""


def validate(rows: list[dict], kind: str, phase: str) -> list[str]:
    errors: list[str] = []
    ids: list[str] = []
    for index, row in enumerate(rows, 1):
        note_id = text(row, "note_id", "笔记ID") or f"row-{index}"
        ids.append(note_id)
        required_fields = CONTENT_COMMON + (LABEL_COMMON if phase == "labeled" else ())
        for field in required_fields:
            aliases = {
                "note_link": ("note_link", "跳转链接"),
                "note_type": ("note_type", "笔记类型"),
                "summary": ("summary", "一句话总结"),
                "label": ("label", "打标结果"),
                "label_reason": ("label_reason", "打标结果原因"),
                "label_source": ("label_source", "打标结果来源"),
            }.get(field, (field,))
            if not text(row, *aliases):
                errors.append(f"{kind} {note_id}: missing {field}")
        if phase == "content":
            premature_labels = {
                "label": text(row, "label", "打标结果"),
                "label_reason": text(row, "label_reason", "打标结果原因"),
                "label_source": text(row, "label_source", "打标结果来源"),
            }
            populated = [name for name, value in premature_labels.items() if value]
            if populated:
                errors.append(
                    f"{kind} {note_id}: v1 content phase contains premature label fields: "
                    + ", ".join(populated)
                )
        link = text(row, "note_link", "跳转链接")
        if link and not LINK.match(link):
            errors.append(f"{kind} {note_id}: invalid Xiaohongshu link")
        summary = text(row, "summary", "一句话总结")
        title = text(row, "athena_title", "Athena标题", "标题")
        if title and len(title) >= 6 and title == summary:
            errors.append(f"{kind} {note_id}: summary copies title")
        if FORMULA_ERRORS.search(json.dumps(row, ensure_ascii=False)):
            errors.append(f"{kind} {note_id}: formula error token found")

        if kind == "video":
            speech = text(row, "key_speech", "关键口播")
            source = text(row, "key_speech_source", "关键口播来源")
            asr = text(row, "asr_trace", "ASR追溯文本（自动转录）", "ASR追溯文本")
            if not asr:
                errors.append(f"video {note_id}: missing ASR trace")
            if not speech:
                errors.append(f"video {note_id}: blank key speech")
            if speech and ("#" in speech or "[话题]" in speech):
                errors.append(f"video {note_id}: key speech contains topic tags")
            if not source or not VIDEO_SOURCE.search(source):
                errors.append(f"video {note_id}: key speech source is not traceable to media")
            if re.search(r"Athena正文|Athena标题|标题", source, re.I):
                errors.append(f"video {note_id}: key speech incorrectly sourced from title/body")
        else:
            copy = text(row, "key_copy", "关键文案")
            source = text(row, "key_copy_source", "关键文案来源")
            structure = text(row, "image_structure", "图文内容结构", "结构化内容路径")
            if not structure:
                errors.append(f"image {note_id}: missing content structure")
            if not copy:
                errors.append(f"image {note_id}: blank key copy")
            if not source or not IMAGE_SOURCE.search(source):
                errors.append(f"image {note_id}: key copy source is not traceable")
            if source == "Athena标题":
                errors.append(f"image {note_id}: title cannot be the fallback key copy")
            body = re.sub(r"\s+", "", text(row, "athena_body", "Athena正文"))
            normalized_copy = re.sub(r"\s+", "", copy)
            if "Athena正文" in source and normalized_copy and normalized_copy not in body:
                errors.append(f"image {note_id}: key copy is not a continuous Athena body quote")

    for note_id, count in Counter(ids).items():
        if count > 1:
            errors.append(f"{kind}: duplicate note_id {note_id}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--phase", required=True, choices=("content", "labeled"))
    parser.add_argument("--video", required=True)
    parser.add_argument("--image", required=True)
    args = parser.parse_args()
    video = json.loads(Path(args.video).read_text("utf-8"))
    image = json.loads(Path(args.image).read_text("utf-8"))
    errors = validate(video, "video", args.phase) + validate(image, "image", args.phase)
    report = {
        "video_rows": len(video),
        "image_rows": len(image),
        "phase": args.phase,
        "passed": not errors,
        "errors": errors,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
