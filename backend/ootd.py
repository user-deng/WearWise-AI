# -*- coding: utf-8 -*-
"""今日 OOTD 署名 —— 视觉 AI 读图给出情绪价值记录。

照片存 PG Large Object（ref=ootd/<iso>.jpg），日记存 ootd_diary 表。
"""
import base64
import random
import threading
import time
from datetime import datetime

import store
import ai

_lock = threading.Lock()

_FALLBACK_READINGS = [
    {"line": "今天的你看起来松弛又坚定，像是在忙碌里为自己留了一点呼吸。",
     "word": "松弛", "keywords": ["松弛", "坚定", "留白"], "signature": "松弛的坚定"},
    {"line": "今天的你有一点疲惫，但依然把生活整理得很体面。",
     "word": "体面", "keywords": ["疲惫", "体面", "整理"], "signature": "体面的疲惫"},
    {"line": "今天的你把颜色压得很低，像在给自己留一点安静的余地。",
     "word": "安静", "keywords": ["安静", "低饱和", "余地"], "signature": "低声的一天"},
]

_PROMPT = """你是一位很懂穿搭、也很懂人的朋友。用户刚拍下/上传了 TA 今天的样子（一张当天穿搭或自拍照）。请你认真看这张照片，读出 TA 今天的状态与心情，写一段温柔、有活人感、有共鸣的「情绪价值记录」。别评判好坏，别说教，像真人朋友在轻声对 TA 说话。

【要求】
1. line：一句温柔、具体、有共鸣的话（≤40字），要结合照片里能看到的穿着/氛围/神态，落点在情绪价值。
2. word：恰好两个中文字的当日总结（如「松弛」「笃定」「柔软」）。
3. keywords：3 个关键词（每个 2-4 字）。
4. signature：一个短署名（4-8字，形如「松弛的坚定」）。

只输出严格 JSON（无代码块围栏、无多余文字）：
{
  "line": "一句情绪价值记录",
  "word": "两字",
  "keywords": ["词一", "词二", "词三"],
  "signature": "短署名"
}"""


def _extract_json(text: str) -> dict:
    import json
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
    raise ValueError("无法解析返回的 JSON")


def _guess_media_type(ctype: str) -> str:
    if ctype in ("image/jpeg", "image/png", "image/gif", "image/webp"):
        return ctype
    return "image/jpeg"


def _normalize(parsed: dict) -> dict:
    line = (parsed.get("line") or "").strip()
    word = (parsed.get("word") or "").strip()
    kws = parsed.get("keywords") or []
    if not isinstance(kws, list):
        kws = [str(kws)]
    keywords = [str(k).strip() for k in kws if str(k).strip()][:3]
    signature = (parsed.get("signature") or "").strip()
    if not word:
        word = (keywords[0] if keywords else "今天")
    word = word[:2] if len(word) > 2 else word
    if not line:
        line = "今天的你，也把自己好好穿在了身上。"
    if not signature:
        signature = word or "今天"
    if not keywords:
        keywords = [word]
    return {"line": line, "word": word, "keywords": keywords, "signature": signature}


def _build_entry(iso: str, reading: dict, source: str, ep_no: int) -> dict:
    dt = datetime.strptime(iso, "%Y-%m-%d")
    ver = int(time.time())
    return {
        "id": f"ootd-{iso}", "iso": iso, "date": dt.strftime("%m.%d"), "day": dt.day,
        "ep": f"EP.{ep_no:03d}", "word": reading["word"], "line": reading["line"],
        "keywords": reading["keywords"], "signature": reading["signature"],
        "photo": f"/ootd/{iso}.jpg?v={ver}",
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"), "source": source,
    }


def _next_ep_no(diary: dict, iso: str) -> int:
    if iso in diary and diary[iso].get("ep"):
        try:
            return int(str(diary[iso]["ep"]).split(".")[-1])
        except (ValueError, IndexError):
            pass
    return 18 + len(diary)


def _generate_reading(media_type: str, b64: str) -> tuple:
    try:
        return _normalize(_extract_json(ai.llm_vision(b64, media_type, _PROMPT))), "claude"
    except Exception:
        return random.choice(_FALLBACK_READINGS).copy(), "fallback"


def sign(image_bytes: bytes, ctype: str = "image/jpeg") -> dict:
    iso = datetime.now().strftime("%Y-%m-%d")
    # ① 存照片到 PG LO（同一天覆盖）
    store.save_blob(f"ootd/{iso}.jpg", "image/jpeg", image_bytes)
    # ② 读图
    media_type = _guess_media_type(ctype)
    b64 = base64.standard_b64encode(image_bytes).decode("utf-8")
    reading, source = _generate_reading(media_type, b64)
    # ③ 写库
    with _lock:
        diary = store.load_diary()
        entry = _build_entry(iso, reading, source, _next_ep_no(diary, iso))
        store.save_diary_entry(iso, entry)
    return entry


def reword(date: str = "") -> dict:
    iso = date or datetime.now().strftime("%Y-%m-%d")
    blob = store.load_blob(f"ootd/{iso}.jpg")
    if not blob:
        raise FileNotFoundError(f"未找到 {iso} 的照片")
    _, data = blob
    b64 = base64.standard_b64encode(data).decode("utf-8")
    reading, source = _generate_reading("image/jpeg", b64)
    with _lock:
        diary = store.load_diary()
        entry = _build_entry(iso, reading, source, _next_ep_no(diary, iso))
        store.save_diary_entry(iso, entry)
    return entry


def list_entries() -> list:
    diary = store.load_diary()
    entries = list(diary.values())
    entries.sort(key=lambda e: e.get("day", 0), reverse=True)
    return entries


def today_entry():
    iso = datetime.now().strftime("%Y-%m-%d")
    return store.load_diary().get(iso)
