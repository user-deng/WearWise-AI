# -*- coding: utf-8 -*-
"""init_db.py — 幂等建表 + 灌入 seed 数据。install.sh 调用（cwd = backend/）。

db.properties 在 zip 根（install.sh 同级），backend/ 相对路径是 ../db.properties。
所有 DDL 幂等；seed 用 ON CONFLICT，重复部署不炸、不重复。
"""
import json
from pathlib import Path

import psycopg

BACKEND = Path(__file__).resolve().parent
ROOT = BACKEND.parent
SEED_DIR = ROOT / "seed_data"


def load_db_props(path: str = "./../db.properties") -> dict:
    props = {}
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


SCHEMA = """
CREATE TABLE IF NOT EXISTS closet_items (
    sku_id      TEXT PRIMARY KEY,
    tags        JSONB NOT NULL DEFAULT '{}'::jsonb,
    wears       INTEGER NOT NULL DEFAULT 0,
    idle_days   INTEGER NOT NULL DEFAULT 0,
    status      TEXT NOT NULL DEFAULT 'ok',
    image_url   TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_closet_status ON closet_items(status);

CREATE TABLE IF NOT EXISTS profile (
    id    INTEGER PRIMARY KEY,
    data  JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS ootd_diary (
    iso    TEXT PRIMARY KEY,
    entry  JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS insights_cache (
    id    INTEGER PRIMARY KEY,
    data  JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS files (
    id            SERIAL PRIMARY KEY,
    ref           TEXT UNIQUE NOT NULL,
    content_type  TEXT,
    oid           OID NOT NULL,
    size          BIGINT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);
"""


def _connect(p: dict):
    return psycopg.connect(
        host=p["db.host"], port=int(p["db.port"]), dbname=p["db.database"],
        user=p["db.username"], password=p["db.password"],
    )


def _seed_closet(conn):
    path = SEED_DIR / "closet_items.json"
    if not path.exists():
        return
    items = json.loads(path.read_text(encoding="utf-8"))
    for it in items:
        conn.execute(
            "INSERT INTO closet_items (sku_id, tags, wears, idle_days, status, image_url) "
            "VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (sku_id) DO NOTHING",
            (it["sku_id"], json.dumps(it.get("tags", {}), ensure_ascii=False),
             int(it.get("wears", 0) or 0), int(it.get("idle_days", 0) or 0),
             it.get("status", "ok"), it.get("image_url")),
        )
    print(f"[seed] closet_items: {len(items)} 条（已存在的跳过）")


def _seed_diary(conn):
    path = SEED_DIR / "ootd_diary.json"
    if not path.exists():
        return
    diary = json.loads(path.read_text(encoding="utf-8"))
    for iso, entry in diary.items():
        conn.execute(
            "INSERT INTO ootd_diary (iso, entry) VALUES (%s, %s) ON CONFLICT (iso) DO NOTHING",
            (iso, json.dumps(entry, ensure_ascii=False)),
        )
    print(f"[seed] ootd_diary: {len(diary)} 条")


def _seed_profile(conn):
    path = SEED_DIR / "profile.json"
    if not path.exists():
        return
    data = json.loads(path.read_text(encoding="utf-8"))
    conn.execute(
        "INSERT INTO profile (id, data) VALUES (1, %s) ON CONFLICT (id) DO NOTHING",
        (json.dumps(data, ensure_ascii=False),),
    )
    print("[seed] profile: 1 条")


def main():
    p = load_db_props()
    if not p.get("db.host"):
        print("[init_db] db.properties 未找到或为空 — 跳过")
        return
    with _connect(p) as conn:
        conn.execute(SCHEMA)
        conn.commit()
        _seed_closet(conn)
        _seed_diary(conn)
        _seed_profile(conn)
        conn.commit()
    print("[init_db] done")


if __name__ == "__main__":
    main()
