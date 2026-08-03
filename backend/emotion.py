# -*- coding: utf-8 -*-
"""选花 → 情绪分析 → 穿搭 query 推荐（走 Runway 文本网关）。

数据来自 zip 内 seed_data/：
  - looks_catalog.json  全部 query 清单 [{index, query, query2, title, desc, keywords}]
  - looks_images.json   index → [{name, front(CDN大片), back(CDN排版)}] 映射
"""
import json
import os
import random
import time
from pathlib import Path

import ai

SEED_DIR = Path(__file__).resolve().parent.parent / "seed_data"


def _load_catalog() -> list:
    p = SEED_DIR / "looks_catalog.json"
    if not p.exists():
        return []
    return json.loads(p.read_text(encoding="utf-8"))


def _load_images() -> dict:
    p = SEED_DIR / "looks_images.json"
    if not p.exists():
        return {}
    return json.loads(p.read_text(encoding="utf-8"))


def _pick_look(index) -> dict:
    imgs = _load_images().get(str(index)) or []
    valid = [s for s in imgs if s.get("front")]
    if not valid:
        return {"name": "", "front": "", "back": ""}
    s = random.choice(valid)
    return {"name": s.get("name", ""), "front": s.get("front", ""), "back": s.get("back", "")}


def _build_prompt(emotions: list, flowers: list, catalog: list) -> str:
    emo = "、".join(emotions) if emotions else "（未提供）"
    fl = "、".join(flowers) if flowers else "（未提供）"
    lines = [f"{c['index']}. {c['query']}" + (f"（{c['keywords']}）" if c.get("keywords") else "")
             for c in catalog]
    return f"""你是一位懂心理也懂穿搭的造型顾问。用户刚刚通过「送自己一束花」的小游戏选了花，我们据此读出了 TA 此刻的情绪。请你判断用户情绪，并从下面的穿搭风格清单里，挑出 **5 个最贴合 TA 当下情绪的风格**，按相关性从高到低排序。

【用户选的花】{fl}
【由花读出的情绪关键词】{emo}

【全部可选穿搭风格（编号. 名称）】
{chr(10).join(lines)}

【要求】
1. 先用一句温柔、有活人感的话总结用户此刻的情绪状态（≤30字）。
2. 从清单里挑 5 个最相关的风格，必须用清单里真实存在的 index 和名称，不要编造。
3. 每个推荐配一句「为什么适合现在的你」（≤25字，具体、有共鸣）。

只输出严格 JSON（无代码块围栏、无多余文字）：
{{
  "mood": "一句情绪总结",
  "recommendations": [
    {{"index": 11, "query": "法式松弛风", "reason": "推荐理由"}}
  ]
}}
recommendations 恰好 5 个，按相关性从高到低。"""


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
    raise ValueError("无法解析返回的 JSON")


def _keywords_to_tags(kw: str) -> list:
    if not kw:
        return []
    parts = [p.strip() for p in kw.replace("，", " ").replace(",", " ").split()]
    return [p if p.startswith("#") else f"#{p}" for p in parts if p]


def _build_reco(c: dict, reason: str) -> dict:
    look = _pick_look(c["index"])
    return {
        "index": c["index"], "query": c["query"], "title": c.get("title", ""),
        "desc": c.get("desc", ""), "tags": _keywords_to_tags(c.get("keywords", "")),
        "reason": reason, "look_name": look["name"],
        "front": look["front"], "back": look["back"],
    }


def recommend(emotions: list, flowers: list = None) -> dict:
    flowers = flowers or []
    catalog = _load_catalog()
    by_index = {c["index"]: c for c in catalog}
    by_query = {c["query"]: c for c in catalog}
    result = {"generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
              "mood": "", "recommendations": [], "source": "claude"}
    try:
        text = ai.llm_messages(
            [{"role": "user", "content": _build_prompt(emotions, flowers, catalog)}], max_tokens=2048)
        parsed = _extract_json(text)
        recos = []
        for item in parsed.get("recommendations", [])[:5]:
            c = by_index.get(item.get("index")) or by_query.get(item.get("query", ""))
            if c:
                recos.append(_build_reco(c, item.get("reason", "")))
        result["mood"] = parsed.get("mood", "")
        result["recommendations"] = recos
    except Exception as e:
        result["source"] = "fallback"
        result["error"] = f"{type(e).__name__}: {e}"
        scored = []
        for c in catalog:
            score = sum(1 for kw in emotions if kw and (kw in c["query"] or kw in c.get("keywords", "")))
            scored.append((score, c))
        scored.sort(key=lambda x: x[0], reverse=True)
        result["mood"] = "为你挑了几套此刻适合的风格"
        result["recommendations"] = [_build_reco(c, "") for _, c in scored[:5]]
    return result
