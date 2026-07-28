#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def run(script: str, args: list[str], expected: int) -> None:
    completed = subprocess.run(
        [sys.executable, str(ROOT / script), *args],
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode != expected:
        raise AssertionError(
            f"{script} returned {completed.returncode}, expected {expected}\n"
            f"{completed.stdout}\n{completed.stderr}"
        )


with tempfile.TemporaryDirectory() as tmp:
    tmpdir = Path(tmp)
    manifest = [
        {
            "object_name": "示例产品",
            "object_role": "本品",
            "spu_name": "示例SPU",
            "note_id": "69d773e4000000002101161f",
            "note_type": "图文笔记",
            "spend_rank": 1,
            "auction_spend": 100.0,
            "time_filter_applied": False,
        }
    ]
    manifest_path = tmpdir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False), "utf-8")
    run("validate_input_manifest.py", [str(manifest_path), "--video-top", "1", "--image-top", "1"], 0)

    video = [
        {
            "note_id": "69463d3e000000000d00dceb",
            "note_link": "https://www.xiaohongshu.com/discovery/item/69463d3e000000000d00dceb",
            "note_type": "视频笔记",
            "athena_title": "示例视频标题",
            "summary": "博主从一日生活切入，按出行和护肤动线展开，并用产品体验及使用结果完成自然承接。",
            "asr_trace": "完整自动转录文本",
            "key_speech": "用下来脸上的细纹会变淡，苹果肌也更饱满。",
            "key_speech_source": "ASR 120.0–126.5s",
            "label": "日常生活",
            "label_reason": "生活动线构成完整主线，删除产品段后仍成立。",
            "label_source": "ASR与时间轴证据；rules v-test",
            "rules_version": "v-test",
            "rules_hash": "abc",
            "rules_fetched_at": "2026-07-28T00:00:00Z",
        }
    ]
    image = [
        {
            "note_id": "69d773e4000000002101161f",
            "note_link": "https://www.xiaohongshu.com/discovery/item/69d773e4000000002101161f",
            "note_type": "图文笔记",
            "athena_title": "示例图文标题",
            "athena_body": "这款面霜涂开很丝滑，坚持使用后脸看起来更紧致饱满。",
            "summary": "内容从肌肤松垮问题切入，集中介绍面霜的肤感和使用结果，并以持续使用建议完成收束。",
            "image_structure": "钩子→展开→产品承接→证据→收束",
            "key_copy": "坚持使用后脸看起来更紧致饱满。",
            "key_copy_source": "Athena正文",
            "label": "单品主导",
            "label_reason": "唯一产品承担完整问题—体验—结果—建议链路。",
            "label_source": "Athena正文与全部图片；rules v-test",
            "rules_version": "v-test",
            "rules_hash": "abc",
            "rules_fetched_at": "2026-07-28T00:00:00Z",
        }
    ]
    video_path = tmpdir / "video.json"
    image_path = tmpdir / "image.json"
    video_path.write_text(json.dumps(video, ensure_ascii=False), "utf-8")
    image_path.write_text(json.dumps(image, ensure_ascii=False), "utf-8")
    run("validate_delivery.py", ["--video", str(video_path), "--image", str(image_path)], 0)

print("validator tests passed")

