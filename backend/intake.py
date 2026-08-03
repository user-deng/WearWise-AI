# -*- coding: utf-8 -*-
"""录入单品：白底商品图补全（图像生成网关）→ 打标签（视觉网关）→ 入库。

白底图存 PG Large Object（ref=img/<sku_id>），前端走 /img/<sku_id> 取。
标签枚举校验沿用原 标签提取 规范。
"""
import base64
import json
import time
import uuid
from pathlib import Path

import store
import ai

PROMPT_DIR = Path(__file__).resolve().parent / "prompts"

ALLOWED = {
    "major": {"上装", "下装", "连身", "鞋履", "内衣家居"},
    "color": {"黑", "白", "灰", "米卡其", "棕驼", "蓝", "绿", "红", "黄", "粉", "其他多色"},
    "season": {"春", "夏", "秋", "冬", "四季通用"},
    "warmth": {"轻薄", "适中", "厚重"},
    "scene": {"居家", "运动", "休闲", "商务", "正式"},
    "layer": {"贴身", "内搭", "外层", "独立穿着"},
    "silhouette": {"修身", "合身", "宽松", "oversize"},
    "sleeve": {"无袖", "短袖", "七分袖", "长袖", "不适用"},
    "length": {"短", "五分", "七分", "九分", "长", "不适用"},
    "style": {"简约", "通勤", "运动", "休闲", "甜美", "优雅", "街头", "复古", "度假", "中性"},
    "material": {"棉", "麻", "牛仔", "针织", "毛呢", "皮革", "雪纺", "羽绒", "功能面料", "其他"},
    "pattern": {"纯色", "条纹", "格纹", "印花", "波点", "拼色", "其他"},
}
_SINGLE_ENUM = ("color", "season", "warmth", "scene", "layer",
                "silhouette", "sleeve", "length", "style", "material", "pattern")


def _read_prompt(name: str) -> str:
    return (PROMPT_DIR / name).read_text(encoding="utf-8")


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
        text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    s, e = text.find("{"), text.rfind("}")
    if s != -1 and e != -1 and e > s:
        return json.loads(text[s:e + 1])
    raise ValueError("无法解析标签 JSON")


def _normalize_tags(raw: dict) -> dict:
    cat = raw.get("category") or {}
    major = cat.get("major") if cat.get("major") in ALLOWED["major"] else "未知"
    tags = {
        "category": {"major": major, "sub": (cat.get("sub") or "").strip()},
        "function": raw.get("function") if isinstance(raw.get("function"), list) else [],
        "description": (raw.get("description") or "").strip(),
    }
    for f in _SINGLE_ENUM:
        v = raw.get(f)
        if f in ALLOWED and v not in ALLOWED[f]:
            v = "未知" if f == "color" else (v or "")
        tags[f] = v or ""
    return tags


def complete_white_bg(raw_bytes: bytes, ctype: str) -> bytes:
    """白底商品图补全：图像生成网关，返回补全后 jpg bytes。"""
    prompt = _read_prompt("complete.txt")
    b64 = base64.standard_b64encode(raw_bytes).decode("utf-8")
    out_b64 = ai.image_generate(prompt, images=[(ctype, b64)])
    return base64.b64decode(out_b64)


def tag_image(image_bytes: bytes) -> dict:
    """对白底图打标签：视觉网关，返回规范化标签。"""
    prompt = _read_prompt("tag.txt")
    b64 = base64.standard_b64encode(image_bytes).decode("utf-8")
    text = ai.llm_vision(b64, "image/jpeg", prompt, max_tokens=1500)
    return _normalize_tags(_extract_json(text))


def intake(raw_bytes: bytes, ctype: str) -> dict:
    """录入：补全 → 打标 → 入库，返回前端 item。"""
    sku_id = f"u{int(time.time())}{uuid.uuid4().hex[:6]}"
    # ① 白底补全
    white = complete_white_bg(raw_bytes, ctype)
    # ② 打标
    tags = tag_image(white)
    # ③ 存图到 PG LO + 入库
    store.save_blob(f"img/{sku_id}", "image/jpeg", white)
    store.append_item(sku_id, tags, image_url=None)  # image_url=None → 走 /img/<sku>
    row = {"sku_id": sku_id, "tags": tags, "wears": 0, "idle_days": 0,
           "status": "ok", "image_url": None}
    return store.to_frontend_item(row)
