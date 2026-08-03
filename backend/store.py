# -*- coding: utf-8 -*-
"""持久化层 —— PostgreSQL（唯一持久化）。

表：
  closet_items(sku_id PK, tags JSONB, wears, idle_days, status, image_url, created_at)
      —— image_url 为空表示图片存 PG Large Object（运行时录入的白底图），走 /img/<sku_id>
  profile(id=1 单行, data JSONB)
  ootd_diary(iso PK, entry JSONB)
  insights_cache(id=1 单行, data JSONB)
  files(id PK, ref TEXT UNIQUE, content_type, oid OID, size)  —— 运行时上传/生成的二进制走 LO

连接：读 db.properties 的 6 个标准 key，用关键字参数连接（不拼 URL，password 含特殊字符不炸）。
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

import psycopg
from psycopg.rows import dict_row
from fastapi import HTTPException

ROOT = Path(__file__).resolve().parent.parent  # zip 根


def _load_props(path: str) -> dict[str, str]:
    props: dict[str, str] = {}
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                props[k.strip()] = v.strip()
    except FileNotFoundError:
        pass
    return props


def get_conn() -> psycopg.Connection:
    # start.sh cd zip 根 → cwd = zip 根，相对路径直接命中（用 ./ 前缀，避免误伤 db-key 校验）
    p = _load_props("./db.properties")
    if not p.get("db.host"):
        raise HTTPException(status_code=503, detail="db.properties 未配置")
    return psycopg.connect(
        host=p["db.host"],
        port=int(p["db.port"]),
        dbname=p["db.database"],
        user=p["db.username"],
        password=p["db.password"],
        row_factory=dict_row,
    )


# ─────────────────────────── Large Object：运行时二进制 ───────────────────────────

def save_blob(ref: str, content_type: str, blob: bytes) -> None:
    """把二进制存 PG Large Object，按 ref 唯一（重复 ref 覆盖）。"""
    with get_conn() as conn:
        # 先删旧的（覆盖语义）
        old = conn.execute("SELECT oid FROM files WHERE ref = %s", (ref,)).fetchone()
        if old:
            try:
                conn.execute("SELECT lo_unlink(%s)", (old["oid"],))
            except Exception:
                pass
            conn.execute("DELETE FROM files WHERE ref = %s", (ref,))
        oid = conn.execute("SELECT lo_create(0) AS oid").fetchone()["oid"]
        fd = conn.execute("SELECT lo_open(%s, %s) AS fd", (oid, 0x20000)).fetchone()["fd"]  # write
        # 分片写，避免单条 SQL 过大
        CHUNK = 1 << 20
        for i in range(0, len(blob), CHUNK):
            conn.execute("SELECT lowrite(%s, %s)", (fd, blob[i:i + CHUNK]))
        conn.execute("SELECT lo_close(%s)", (fd,))
        conn.execute(
            "INSERT INTO files (ref, content_type, oid, size) VALUES (%s, %s, %s, %s)",
            (ref, content_type, oid, len(blob)),
        )
        conn.commit()


def load_blob(ref: str) -> Optional[tuple[str, bytes]]:
    """读回二进制，返回 (content_type, bytes)；不存在返回 None。"""
    with get_conn() as conn:
        row = conn.execute("SELECT content_type, oid FROM files WHERE ref = %s", (ref,)).fetchone()
        if not row:
            return None
        fd = conn.execute("SELECT lo_open(%s, %s) AS fd", (row["oid"], 0x40000)).fetchone()["fd"]  # read
        chunks = []
        while True:
            part = conn.execute("SELECT loread(%s, %s) AS d", (fd, 1 << 20)).fetchone()["d"]
            if not part:
                break
            chunks.append(bytes(part))
        conn.execute("SELECT lo_close(%s)", (fd,))
        return row["content_type"], b"".join(chunks)


# ─────────────────────────── 衣橱 ───────────────────────────

_COLOR_SWATCH = {
    "黑": "#191614", "白": "#f6f4ef", "灰": "#c9c6bf", "米卡其": "#e3dac6",
    "棕驼": "#a98b6b", "蓝": "#4a5a72", "绿": "#8b9a82", "红": "#6b2233",
    "黄": "#c08a3e", "粉": "#d6bdb8", "其他多色": "#b9b2a6", "未知": "#b9b2a6",
}


def to_frontend_item(row: dict) -> dict:
    """DB 行 → 前端 ClosetItem 结构。"""
    tags = row.get("tags") or {}
    cat = tags.get("category") or {}
    major = cat.get("major") or "未知"
    color = tags.get("color") or "未知"
    sku = row.get("sku_id", "")
    desc = tags.get("description") or ""
    sub = cat.get("sub") or ""
    name = (desc.split("，")[0].split("。")[0] if desc else "") or f"{color}{sub}".strip() or "单品"
    # image_url 有值（CDN 直链）就用直链；否则走后端 /img/<sku>（LO）
    image = row.get("image_url") or f"/img/{sku}"
    return {
        "id": sku, "sku_id": sku, "name": name, "category": major,
        "color": color, "swatch": _COLOR_SWATCH.get(color, "#b9b2a6"),
        "wears": int(row.get("wears", 0) or 0),
        "idleDays": int(row.get("idle_days", 0) or 0),
        "image": image,
        "sub": sub, "season": tags.get("season", ""), "scene": tags.get("scene", ""),
        "material": tags.get("material", ""), "style": tags.get("style", ""),
        "silhouette": tags.get("silhouette", ""), "pattern": tags.get("pattern", ""),
        "description": desc,
    }


def load_items() -> list[dict]:
    with get_conn() as conn:
        return conn.execute(
            "SELECT sku_id, tags, wears, idle_days, status, image_url "
            "FROM closet_items WHERE status = 'ok'"
        ).fetchall()


def append_item(sku_id: str, tags: dict, image_url: Optional[str] = None) -> None:
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO closet_items (sku_id, tags, wears, idle_days, status, image_url) "
            "VALUES (%s, %s, 0, 0, 'ok', %s) "
            "ON CONFLICT (sku_id) DO UPDATE SET tags = EXCLUDED.tags, image_url = EXCLUDED.image_url",
            (sku_id, json.dumps(tags, ensure_ascii=False), image_url),
        )
        conn.commit()


def remove_item(sku_id: str) -> bool:
    with get_conn() as conn:
        r = conn.execute("DELETE FROM closet_items WHERE sku_id = %s", (sku_id,))
        conn.commit()
        return r.rowcount > 0


def sort_items(items: list, sort: str) -> list:
    if sort == "wears":
        return sorted(items, key=lambda i: i.get("wears", 0), reverse=True)
    if sort == "idle":
        return sorted(items, key=lambda i: i.get("idleDays", 0), reverse=True)
    if sort == "name":
        return sorted(items, key=lambda i: i.get("name", ""))
    return items


# ─────────────────────────── 形象档案 ───────────────────────────

def load_profile() -> Optional[dict]:
    with get_conn() as conn:
        row = conn.execute("SELECT data FROM profile WHERE id = 1").fetchone()
        return row["data"] if row else None


def save_profile(data: dict) -> None:
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO profile (id, data) VALUES (1, %s) "
            "ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data",
            (json.dumps(data, ensure_ascii=False),),
        )
        conn.commit()


# ─────────────────────────── OOTD 日记 ───────────────────────────

def load_diary() -> dict:
    with get_conn() as conn:
        rows = conn.execute("SELECT iso, entry FROM ootd_diary").fetchall()
        return {r["iso"]: r["entry"] for r in rows}


def save_diary_entry(iso: str, entry: dict) -> None:
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO ootd_diary (iso, entry) VALUES (%s, %s) "
            "ON CONFLICT (iso) DO UPDATE SET entry = EXCLUDED.entry",
            (iso, json.dumps(entry, ensure_ascii=False)),
        )
        conn.commit()


# ─────────────────────────── AI 建议缓存 ───────────────────────────

def load_insights() -> Optional[dict]:
    with get_conn() as conn:
        row = conn.execute("SELECT data FROM insights_cache WHERE id = 1").fetchone()
        return row["data"] if row else None


# ─────────────────────────── 背景音乐（CDN 直链，seed 静态清单） ───────────────────────────

def load_music() -> list:
    """从 zip 内 seed_data/music.json 读音乐清单（title + CDN url）。"""
    p = ROOT / "seed_data" / "music.json"
    if not p.exists():
        return []
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []


def save_insights(data: dict) -> None:
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO insights_cache (id, data) VALUES (1, %s) "
            "ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data",
            (json.dumps(data, ensure_ascii=False),),
        )
        conn.commit()
