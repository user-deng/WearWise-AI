# -*- coding: utf-8 -*-
"""AItress 后端（cowork 版）—— FastAPI 单进程：API + 图像(PG LO) + 静态前端托管。

数据全局共享（无 SSO）：所有访问者读写同一份衣橱/形象/日记。
持久化全部走 PostgreSQL；运行时生成的图片存 PG Large Object。
AI 全部走 Runway 网关（backend/ai.py）。
"""
from __future__ import annotations

import json
import os
import sys
import threading
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional

# start.sh 用 `uvicorn backend.app:app`（cwd=项目根），此时 backend/ 不在 sys.path 上，
# 下方对同级模块（store/intake/...）的裸导入会 ModuleNotFoundError。把本文件所在目录
# （backend/）加入 sys.path，保证无论从项目根还是 backend/ 启动都能导入同级模块。
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile, Response
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

import store
import intake as intake_mod
import insights as insights_mod
import emotion as emotion_mod
import ootd as ootd_mod
import avatar as avatar_mod

ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIST = ROOT / "frontend" / "dist"
INDEX_HTML = FRONTEND_DIST / "index.html"

app = FastAPI(title="AItress API (cowork)", version="1.0.0")


# ─────────────────────────── SSO 身份（Hard Rule #4） ───────────────────────────
# 平台在每个请求注入 Decrypted-Userinfo header（latin-1 编码的 UTF-8 JSON）。
# 本作品数据全局共享（所有登录用户读写同一份衣橱/形象/日记），但仍必须用 SSO
# 拦未登录请求——拿不到用户一律 401，由 Cowork Guard 处理登录跳转。禁止匿名 fallback。
def _parse_sso_user(decrypted_userinfo: Optional[str]) -> Optional[dict]:
    if not decrypted_userinfo:
        return None
    try:
        fixed = decrypted_userinfo.encode("latin-1").decode("utf-8")  # ⚠️ latin-1 → utf-8
        data = json.loads(fixed)
    except Exception:
        return None
    return {
        "userId": data.get("userId") or data.get("id"),
        "username": data.get("username") or data.get("name") or data.get("displayName"),
        "email": data.get("email") or data.get("workEmail"),
    }


def _require_user(decrypted_userinfo: Optional[str]) -> dict:
    """拿不到 SSO 用户 → 401。所有业务路由 MUST 调。"""
    user = _parse_sso_user(decrypted_userinfo)
    if not user:
        raise HTTPException(status_code=401, detail="unauthenticated")
    return user


_DEFAULT_PROFILE = {
    "nickname": "林一格", "height": "166 cm", "weight": "52 kg", "age": "",
    "gender": "女", "occupation": "",
    "bodyNotes": "肩线偏窄、腰线明显、下半身量感较强",
    "fileNo": "NO. 0417", "fullBody": "",
}


def _profile() -> dict:
    p = store.load_profile()
    return {**_DEFAULT_PROFILE, **(p or {})}


# ─────────────────────────── health ───────────────────────────
@app.get("/health")
def health():
    try:
        n = len(store.load_items())
    except Exception:
        n = -1
    return {"status": "ok", "db_items": n}


# ─────────────────────────── 衣橱 ───────────────────────────
@app.get("/api/closet")
def get_closet(category: str = "全部", sort: str = "idle",
               decrypted_userinfo: Optional[str] = Header(None, alias="Decrypted-Userinfo")):
    _require_user(decrypted_userinfo)
    items = [store.to_frontend_item(i) for i in store.load_items()]
    if category and category != "全部":
        items = [i for i in items if i["category"] == category]
    items = store.sort_items(items, sort)
    return {"total": len(items), "items": items}


@app.get("/img/{sku_id}")
def get_image(sku_id: str):
    blob = store.load_blob(f"img/{sku_id.split('/')[-1]}")
    if not blob:
        raise HTTPException(status_code=404, detail="图片不存在")
    ctype, data = blob
    return Response(content=data, media_type=ctype or "image/jpeg")


@app.delete("/api/closet/{sku_id}")
def delete_item(sku_id: str,
                decrypted_userinfo: Optional[str] = Header(None, alias="Decrypted-Userinfo")):
    _require_user(decrypted_userinfo)
    if not store.remove_item(sku_id):
        raise HTTPException(status_code=404, detail="未找到该单品")
    return {"ok": True, "sku_id": sku_id}


@app.get("/api/closet/insights")
def get_insights(refresh: int = 0,
                 decrypted_userinfo: Optional[str] = Header(None, alias="Decrypted-Userinfo")):
    _require_user(decrypted_userinfo)
    return insights_mod.generate() if refresh else insights_mod.load_cached()


@app.post("/api/closet/intake")
async def intake_item(file: UploadFile = File(...),
                      decrypted_userinfo: Optional[str] = Header(None, alias="Decrypted-Userinfo")):
    _require_user(decrypted_userinfo)
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="空文件")
    ctype = file.content_type or "image/jpeg"
    if not ctype.startswith("image/"):
        ctype = "image/jpeg"
    try:
        return intake_mod.intake(raw, ctype)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"录入失败: {type(e).__name__}: {e}")


# ─────────────────────────── 送花 → 推荐 ───────────────────────────
class EmotionReq(BaseModel):
    emotions: list = []
    flowers: list = []


@app.post("/api/emotion/recommend")
def emotion_recommend(req: EmotionReq,
                      decrypted_userinfo: Optional[str] = Header(None, alias="Decrypted-Userinfo")):
    _require_user(decrypted_userinfo)
    return emotion_mod.recommend(req.emotions, req.flowers)


# ─────────────────────────── 背景音乐 ───────────────────────────
@app.get("/api/music")
def list_music(decrypted_userinfo: Optional[str] = Header(None, alias="Decrypted-Userinfo")):
    _require_user(decrypted_userinfo)
    return {"tracks": store.load_music()}


# ─────────────────────────── 今日署名 ───────────────────────────
@app.post("/api/ootd/sign")
async def ootd_sign(file: UploadFile = File(...),
                    decrypted_userinfo: Optional[str] = Header(None, alias="Decrypted-Userinfo")):
    _require_user(decrypted_userinfo)
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="空文件")
    ctype = file.content_type or "image/jpeg"
    if not ctype.startswith("image/"):
        ctype = "image/jpeg"
    try:
        return ootd_mod.sign(raw, ctype)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"署名失败: {type(e).__name__}: {e}")


class RewordReq(BaseModel):
    date: str = ""


@app.post("/api/ootd/reword")
def ootd_reword(req: RewordReq,
                decrypted_userinfo: Optional[str] = Header(None, alias="Decrypted-Userinfo")):
    _require_user(decrypted_userinfo)
    try:
        return ootd_mod.reword(req.date)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"换一种说法失败: {type(e).__name__}: {e}")


@app.get("/api/ootd/diary")
def ootd_diary(decrypted_userinfo: Optional[str] = Header(None, alias="Decrypted-Userinfo")):
    _require_user(decrypted_userinfo)
    return {"entries": ootd_mod.list_entries(), "today": ootd_mod.today_entry()}


@app.get("/ootd/{filename}")
def get_ootd_media(filename: str):
    """署名照片（PG LO）。灵感页预置视频/排版图走 CDN 直链（前端已直接引用 CDN，不经这里）。"""
    safe = filename.split("/")[-1]
    blob = store.load_blob(f"ootd/{safe}")
    if not blob:
        raise HTTPException(status_code=404, detail="文件不存在")
    ctype, data = blob
    return Response(content=data, media_type=ctype or "application/octet-stream")


# ─────────────────────────── 我的形象 ───────────────────────────
@app.get("/api/profile")
def get_profile(decrypted_userinfo: Optional[str] = Header(None, alias="Decrypted-Userinfo")):
    _require_user(decrypted_userinfo)
    return _profile()


@app.get("/avatar/{name}")
def get_avatar(name: str):
    blob = store.load_blob(f"avatar/{name.split('/')[-1]}")
    if not blob:
        raise HTTPException(status_code=404, detail="形象图不存在")
    ctype, data = blob
    return Response(content=data, media_type=ctype or "image/jpeg")


@app.post("/api/profile/avatar")
async def generate_avatar(
    files: List[UploadFile] = File(...),
    gender: str = Form("女"), height: str = Form(""), weight: str = Form(""),
    age: str = Form(""), occupation: str = Form(""), nickname: str = Form(""),
    bodyNotes: str = Form(""),
    decrypted_userinfo: Optional[str] = Header(None, alias="Decrypted-Userinfo"),
):
    _require_user(decrypted_userinfo)
    user_images = []
    for i, uf in enumerate(files[:3]):
        data = await uf.read()
        if not data:
            continue
        ct = uf.content_type or "image/jpeg"
        ext = ".png" if ct == "image/png" else ".jpg"
        user_images.append((f"user_{i}{ext}", data, ct))
    if not user_images:
        raise HTTPException(status_code=400, detail="请至少上传 1 张参考图")

    info = {"gender": gender, "height": height, "weight": weight,
            "age": age, "occupation": occupation}
    try:
        img_bytes = avatar_mod.generate(user_images, info)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"形象生成失败: {e}")

    url = avatar_mod.save_avatar(img_bytes)
    profile = _profile()
    profile.update({
        "gender": gender,
        "height": height or profile.get("height", ""),
        "weight": weight or profile.get("weight", ""),
        "age": age or profile.get("age", ""),
        "occupation": occupation or profile.get("occupation", ""),
        "nickname": nickname or profile.get("nickname", ""),
        "bodyNotes": bodyNotes or profile.get("bodyNotes", ""),
        "fullBody": url,
    })
    store.save_profile(profile)
    return profile


@app.post("/api/profile")
async def update_profile(
    nickname: str = Form(""), height: str = Form(""), weight: str = Form(""),
    bodyNotes: str = Form(""), gender: str = Form(""), age: str = Form(""),
    occupation: str = Form(""),
    decrypted_userinfo: Optional[str] = Header(None, alias="Decrypted-Userinfo"),
):
    _require_user(decrypted_userinfo)
    profile = _profile()
    for k, v in {"nickname": nickname, "height": height, "weight": weight,
                 "bodyNotes": bodyNotes, "gender": gender, "age": age,
                 "occupation": occupation}.items():
        if v:
            profile[k] = v
    store.save_profile(profile)
    return profile


# ─────────────────────────── 每日 0 点重算 AI 建议 ───────────────────────────
def _seconds_until_next_midnight() -> float:
    now = datetime.now()
    tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return (tomorrow - now).total_seconds()


def _insights_scheduler():
    while True:
        time.sleep(_seconds_until_next_midnight())
        try:
            insights_mod.generate()
        except Exception:
            pass
        time.sleep(60)


@app.on_event("startup")
def _start_scheduler():
    threading.Thread(target=_insights_scheduler, daemon=True).start()


# ─────────────────────────── 静态前端托管 + SPA fallback ───────────────────────────
@app.get("/")
def index():
    if not INDEX_HTML.exists():
        return JSONResponse({"error": "frontend/dist 未 build"}, status_code=503)
    return FileResponse(INDEX_HTML)


@app.get("/{full_path:path}")
def spa_fallback(full_path: str):
    if full_path.startswith(("api/", "img/", "ootd/", "avatar/")):
        return JSONResponse({"error": "not found"}, status_code=404)
    real = FRONTEND_DIST / full_path
    if real.is_file():
        return FileResponse(real)
    if INDEX_HTML.exists():
        return FileResponse(INDEX_HTML)
    return JSONResponse({"error": "frontend/dist 未 build"}, status_code=503)
