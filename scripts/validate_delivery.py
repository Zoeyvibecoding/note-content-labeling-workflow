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
    "content_category",
    "label",
    "label_reason",
    "label_evidence",
    "counterfactual_check",
    "nearest_label",
    "exclusion_reason",
    "confidence",
    "review_flag",
    "label_source",
    "understanding_status",
    "rules_version",
    "rules_hash",
    "rules_fetched_at",
)

LABEL_ALIASES = {
    "content_category": ("content_category", "内容大类"),
    "label": ("label", "打标结果", "打标标签"),
    "label_reason": ("label_reason", "打标结果原因", "打标原因"),
    "label_evidence": ("label_evidence", "内容证据"),
    "counterfactual_check": ("counterfactual_check", "反事实检验"),
    "nearest_label": ("nearest_label", "最邻近标签"),
    "exclusion_reason": ("exclusion_reason", "排除原因"),
    "confidence": ("confidence", "置信度"),
    "review_flag": ("review_flag", "复核标记"),
    "label_source": ("label_source", "打标结果来源"),
    "understanding_status": ("understanding_status", "理解状态"),
    "rules_version": ("rules_version", "打标规则版本", "字典版本"),
    "rules_hash": ("rules_hash",),
    "rules_fetched_at": ("rules_fetched_at",),
}


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
            }.get(field, LABEL_ALIASES.get(field, (field,)))
            if not text(row, *aliases):
                errors.append(f"{kind} {note_id}: missing {field}")
        if phase == "content":
            premature_labels = {
                field: text(row, *LABEL_ALIASES.get(field, (field,)))
                for field in LABEL_COMMON
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


def validate_inheritance(v1_rows: list[dict], v2_rows: list[dict], kind: str) -> list[str]:
    errors: list[str] = []
    v1_by_id = {text(row, "note_id", "笔记ID"): row for row in v1_rows}
    v2_by_id = {text(row, "note_id", "笔记ID"): row for row in v2_rows}
    if len(v1_rows) != len(v2_rows):
        errors.append(f"{kind}: v2 row count differs from confirmed v1")
    if set(v1_by_id) != set(v2_by_id):
        missing = sorted(set(v1_by_id) - set(v2_by_id))
        extra = sorted(set(v2_by_id) - set(v1_by_id))
        errors.append(f"{kind}: v1/v2 note_id mismatch; missing={missing}, extra={extra}")
        return errors

    for note_id, v1_row in v1_by_id.items():
        v2_row = v2_by_id[note_id]
        v1_fields = list(v1_row.keys())
        v2_fields = list(v2_row.keys())
        if v2_fields[: len(v1_fields)] != v1_fields:
            errors.append(
                f"{kind} {note_id}: v1 fields were deleted, renamed, reordered, or not kept on the left"
            )
            continue
        for field in v1_fields:
            if v2_row.get(field) != v1_row.get(field):
                errors.append(f"{kind} {note_id}: confirmed v1 value changed in field {field}")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--phase", required=True, choices=("content", "labeled"))
    parser.add_argument("--video", required=True)
    parser.add_argument("--image", required=True)
    parser.add_argument("--v1-video")
    parser.add_argument("--v1-image")
    args = parser.parse_args()
    video = json.loads(Path(args.video).read_text("utf-8"))
    image = json.loads(Path(args.image).read_text("utf-8"))
    errors = validate(video, "video", args.phase) + validate(image, "image", args.phase)
    if args.phase == "labeled":
        if not args.v1_video or not args.v1_image:
            errors.append("labeled phase requires --v1-video and --v1-image inheritance inputs")
        else:
            v1_video = json.loads(Path(args.v1_video).read_text("utf-8"))
            v1_image = json.loads(Path(args.v1_image).read_text("utf-8"))
            errors += validate_inheritance(v1_video, video, "video")
            errors += validate_inheritance(v1_image, image, "image")
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
