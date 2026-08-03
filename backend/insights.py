# -*- coding: utf-8 -*-
"""衣橱 AI 建议 —— 走 Runway 文本网关生成三张洞察卡 + 健康标题。

统计确定性计算；三张建议卡与健康标题由 LLM 生成，缓存进 PG。
"""
import json
import time
from collections import Counter

import store
import ai

_ACCENT = {
    "断舍离": "var(--rx-wine)",
    "焕新搭配": "var(--rx-sage-deep)",
    "重复度": "var(--rx-blush-deep)",
}

_FALLBACK = {
    "断舍离": {"title": "有些单品在等一个不会来的场合", "body": "几件已闲置超 30 天。要不要先移到「观察区」，30 天后再决定？"},
    "焕新搭配": {"title": "试试还没同框过的两件", "body": "衣橱里有些单品从没一起出现过，也许正好能演一个新角色。"},
    "重复度": {"title": "颜色有点集中", "body": "主色调偏重，适当加入对比色，画面会更有呼吸感。"},
}


def compute_stats(items: list) -> dict:
    total = len(items)
    idle30 = sum(1 for i in items if i.get("idleDays", 0) >= 30)
    active30 = total - idle30
    often = sum(1 for i in items if i.get("wears", 0) >= 20)
    sometimes = sum(1 for i in items if 6 <= i.get("wears", 0) < 20)
    sleeping = sum(1 for i in items if i.get("wears", 0) < 6)
    utilization = round(active30 / total * 100) if total else 0
    worn = (sum(1 for i in items if i.get("wears", 0) >= 6) / total) if total else 0
    health = round((active30 / total * 0.6 + worn * 0.4) * 100) if total else 70
    health = max(70, min(100, health))
    colors = Counter(i.get("color", "未知") for i in items)
    top_color, top_color_n = (colors.most_common(1)[0] if colors else ("未知", 0))
    color_ratio = round(top_color_n / total * 100) if total else 0
    return {
        "total": total, "idle30": idle30, "utilization": utilization,
        "counts": {"常穿": often, "偶尔": sometimes, "沉睡": sleeping},
        "health": health, "top_color": top_color, "color_ratio": color_ratio,
    }


def _distribution(items: list, field: str) -> str:
    c = Counter(i.get(field, "未知") or "未知" for i in items)
    return " · ".join(f"{k}{n}" for k, n in c.most_common())


def _build_prompt(items: list, stats: dict) -> str:
    cat_dist = _distribution(items, "category")
    color_dist = _distribution(items, "color")
    scene_dist = _distribution(items, "scene")
    style_dist = _distribution(items, "style")
    idle_items = sorted([i for i in items if i.get("idleDays", 0) >= 30],
                        key=lambda i: i.get("idleDays", 0), reverse=True)
    idle_lines = [
        f"- {i.get('name','')}（{i.get('category','')}·{i.get('color','')}·闲置{i.get('idleDays',0)}天·共穿{i.get('wears',0)}次）"
        for i in idle_items]
    by_cat = {}
    for i in items:
        by_cat.setdefault(i.get("category", "未知"), []).append(i)
    cat_lines = []
    for cat, arr in by_cat.items():
        names = "、".join(f"{x.get('color','')}{x.get('sub') or x.get('name','')}" for x in arr)
        cat_lines.append(f"■ {cat}（{len(arr)}件）：{names}")
    return f"""你是一位超懂穿搭、嘴很甜也很会夸人的闺蜜型衣橱搭子。请把这位用户【整个衣橱的所有衣服】过一遍，用活泼、有活人感、带点小俏皮的口吻，给出建议。别端着、别说教，像真人在跟好朋友聊天。

【衣橱统计】
- 单品总数：{stats['total']} 件
- 闲置超30天：{stats['idle30']} 件
- 近30天启用率：{stats['utilization']}%
- 常穿/偶尔/沉睡：{stats['counts']['常穿']} / {stats['counts']['偶尔']} / {stats['counts']['沉睡']}

【全量分布】
- 品类：{cat_dist}
- 颜色：{color_dist}
- 场景：{scene_dist}
- 风格：{style_dist}

【所有闲置超30天的单品】（共{len(idle_items)}件）
{chr(10).join(idle_lines) if idle_lines else '（无）'}

【全部单品清单（按品类）】
{chr(10).join(cat_lines) if cat_lines else '（无）'}

【要求】
1. 必须基于上面【所有】衣服总结，不臆造不存在的单品；点名时用清单里真实出现的单品/颜色。
2. 每条 body **最多两句话**，精准、有画面感、有活力；可以适度用感叹、俏皮的比喻，但不浮夸、不空话。
3. 给一个【健康度分数】：整数，范围 **70-100**。综合启用率、闲置比例、颜色/风格丰富度打分。同时给一句对应的、有活力的健康标题。

只输出严格 JSON（无代码块围栏、无多余文字）：
{{
  "健康分数": 78,
  "健康标题": "4-8字有活力的状态短语",
  "insights": [
    {{"kind": "断舍离", "title": "≤15字俏皮小标题", "body": "最多两句，点名闲置最久的具体单品，给个爽快的处理建议"}},
    {{"kind": "焕新搭配", "title": "≤15字，形如「A × B」", "body": "最多两句，用衣橱里真实的两件单品配一套，说清好看在哪、能穿去哪"}},
    {{"kind": "重复度", "title": "≤15字，点出颜色/风格扎堆", "body": "最多两句，指出占比最高的颜色或风格，安利一个能打破单调的具体方向"}}
  ]
}}"""


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


def _fallback_cards() -> list:
    return [{"kind": k, "title": v["title"], "body": v["body"], "accent": _ACCENT[k]}
            for k, v in _FALLBACK.items()]


def _health_title_by_score(score: int) -> str:
    if score >= 90:
        return "衣橱正当红"
    if score >= 80:
        return "衣橱状态在线"
    return "还能再盘活一点"


def generate() -> dict:
    items = [store.to_frontend_item(i) for i in store.load_items()]
    stats = compute_stats(items)
    result = {
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "stats": stats, "health_title": "", "insights": [], "source": "claude",
    }
    try:
        text = ai.llm_messages(
            [{"role": "user", "content": _build_prompt(items, stats)}], max_tokens=4096)
        parsed = _extract_json(text)
        cards = []
        for c in parsed.get("insights", []):
            kind = c.get("kind", "")
            if kind in _ACCENT:
                cards.append({"kind": kind, "title": c.get("title", ""),
                              "body": c.get("body", ""), "accent": _ACCENT[kind]})
        have = {c["kind"] for c in cards}
        for k, v in _FALLBACK.items():
            if k not in have:
                cards.append({"kind": k, "title": v["title"], "body": v["body"], "accent": _ACCENT[k]})
        order = ["断舍离", "焕新搭配", "重复度"]
        cards.sort(key=lambda c: order.index(c["kind"]))
        try:
            score = int(round(float(parsed.get("健康分数", stats["health"]))))
        except (TypeError, ValueError):
            score = stats["health"]
        score = max(70, min(100, score))
        stats["health"] = score
        result["health_title"] = parsed.get("健康标题", "") or _health_title_by_score(score)
        result["insights"] = cards
    except Exception as e:
        result["source"] = "fallback"
        result["error"] = f"{type(e).__name__}: {e}"
        result["health_title"] = _health_title_by_score(stats["health"])
        result["insights"] = _fallback_cards()
    store.save_insights(result)
    return result


def load_cached() -> dict:
    cached = store.load_insights()
    if cached:
        return cached
    return generate()
