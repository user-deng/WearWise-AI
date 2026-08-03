# -*- coding: utf-8 -*-
"""我的形象生成 —— 图像生成网关（Runway Gemini）。

按性别选固定基准图（定义构图/姿势/背景/画风）+ 用户 1~3 张参考图 + 填充后的 prompt，
生成全身形象图。生成图存 PG Large Object（ref=avatar/<name>.jpg），走 /avatar/<name> 取。

基准图与 prompt 模板随后端一起打包在 backend/assets/ 与 backend/prompts/。
"""
import base64
import time
from pathlib import Path

import store
import ai

ASSETS_DIR = Path(__file__).resolve().parent / "assets"
PROMPT_DIR = Path(__file__).resolve().parent / "prompts"

REFERENCE_FEMALE = ASSETS_DIR / "model_female.png"
REFERENCE_MALE = ASSETS_DIR / "model_male.png"

MAX_RETRIES = 3
BACKOFF_BASE = 2.0


def _reference_for_gender(gender: str) -> Path:
    g = str(gender or "").strip()
    if g in ("男", "male", "Male", "M", "m", "男性"):
        return REFERENCE_MALE
    return REFERENCE_FEMALE


def _fill_prompt(info: dict) -> str:
    template = (PROMPT_DIR / "avatar.txt").read_text(encoding="utf-8")
    result = template
    for k in ("gender", "height", "weight", "age", "occupation"):
        result = result.replace("{" + k + "}", str(info.get(k, "") or "未提供"))
    return result


def generate(user_images: list, info: dict) -> bytes:
    """user_images: list[(filename, bytes, content_type)]；返回生成图 jpg bytes。"""
    prompt = _fill_prompt(info)
    ref_path = _reference_for_gender(info.get("gender", ""))
    if not ref_path.exists():
        raise FileNotFoundError(f"缺少参考基准图: {ref_path}")

    images: list[tuple[str, str]] = []
    ref_mime = "image/png" if ref_path.suffix.lower() == ".png" else "image/jpeg"
    images.append((ref_mime, base64.standard_b64encode(ref_path.read_bytes()).decode("utf-8")))
    for _fn, data, ct in user_images[:3]:
        images.append((ct or "image/jpeg", base64.standard_b64encode(data).decode("utf-8")))

    last_err = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            out_b64 = ai.image_generate(prompt, images=images)
            return base64.b64decode(out_b64)
        except Exception as e:  # noqa: BLE001
            last_err = f"{type(e).__name__}: {e}"
            if attempt < MAX_RETRIES:
                time.sleep(BACKOFF_BASE * (2 ** (attempt - 1)))
    raise RuntimeError(f"形象生成失败（已重试{MAX_RETRIES}次）：{last_err}")


def save_avatar(image_bytes: bytes) -> str:
    """存生成图到 PG LO，返回可访问 URL（/avatar/<name>）。"""
    name = f"avatar_{int(time.time())}.jpg"
    store.save_blob(f"avatar/{name}", "image/jpeg", image_bytes)
    return f"/avatar/{name}"
