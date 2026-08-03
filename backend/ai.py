# -*- coding: utf-8 -*-
"""AI 调用层 —— 全部走 Runway 网关。

文本 / 视觉：Runway Bedrock（Anthropic Messages 协议）
图像生成：Runway Google GenerateContent（Gemini Nano Banana）

⚠️ 禁止直连 anthropic / openai / google SDK；文本用 token: header，图像用 api-key: header。
凭据来自与 install.sh 同级的 ai.properties（平台注入）。
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

import httpx
from fastapi import HTTPException

ROOT = Path(__file__).resolve().parent.parent  # zip 根（install.sh 同级）


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


def _ai_props() -> dict[str, str]:
    # start.sh: cd zip 根后 exec，业务进程 cwd = zip 根 → 相对路径 "ai.properties"
    return _load_props("ai.properties")


# ─────────────────────────── 文本 / 视觉：Runway Bedrock ───────────────────────────

def llm_messages(messages: list[dict], max_tokens: int = 4096) -> str:
    """调 Runway Bedrock 文本/视觉接口，返回第一个 text block 的文本。

    messages 用 Anthropic Messages 协议（支持 content 内嵌 image block 做视觉）。
    """
    p = _ai_props()
    base = p.get("ai.base_url")
    key = p.get("ai.api_key")
    if not base or not key:
        raise HTTPException(status_code=503, detail="ai.properties 未配置文本 AI")

    with httpx.Client(timeout=120) as client:
        resp = client.post(
            f"{base}/bedrock_runtime/model/invoke",
            headers={"token": key, "Content-Type": "application/json"},
            json={
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": max_tokens,
                "messages": messages,
            },
        )
    data = resp.json()
    if data.get("Code") or data.get("Error"):
        raise RuntimeError(f"AI call failed: {data}")
    # 可能含 thinking block，取第一个 text 类型
    for block in data.get("content", []):
        if block.get("type") == "text":
            return block["text"]
    # 兜底：老格式 content[0].text
    try:
        return data["content"][0]["text"]
    except (KeyError, IndexError, TypeError):
        raise RuntimeError(f"AI 返回中无 text block: {data}")


def llm_vision(image_b64: str, media_type: str, prompt: str,
               max_tokens: int = 1024) -> str:
    """单图 + 文本的视觉调用，返回模型文本。"""
    return llm_messages(
        [{
            "role": "user",
            "content": [
                {"type": "image",
                 "source": {"type": "base64", "media_type": media_type, "data": image_b64}},
                {"type": "text", "text": prompt},
            ],
        }],
        max_tokens=max_tokens,
    )


# ─────────────────────────── 图像生成：Runway Gemini ───────────────────────────

def image_generate(prompt: str, images: Optional[list[tuple[str, str]]] = None,
                   max_output_tokens: int = 32768) -> str:
    """调 Runway Google GenerateContent 生成图，返回图像 base64。

    images: list[(mime_type, base64)]，作为参考图与 prompt 一起送入（图像编辑/合成）。
    ⚠️ 图像通路与文本完全独立：api-key: header、独立配额，缺 key 直接 503，禁止 fallback 到文本 key。
    """
    p = _ai_props()
    base = p.get("ai.image_base_url")
    key = p.get("ai.image_api_key")
    if not base or not key:
        raise HTTPException(status_code=503, detail="ai.properties 未配置图像 AI")

    parts: list[dict] = []
    for mime, b64 in (images or []):
        parts.append({"inlineData": {"mimeType": mime, "data": b64}})
    parts.append({"text": prompt})

    with httpx.Client(timeout=300) as client:
        resp = client.post(
            f"{base}/google/v1:generateContent",
            headers={"api-key": key, "Content-Type": "application/json"},
            json={
                "contents": [{"role": "user", "parts": parts}],
                "generationConfig": {
                    "responseModalities": ["TEXT", "IMAGE"],
                    "maxOutputTokens": max_output_tokens,
                },
            },
        )
    data = resp.json()
    if data.get("Code") or data.get("Error"):
        raise RuntimeError(f"image gen failed: {data}")

    candidates = data.get("candidates") or []
    if not candidates:
        raise RuntimeError(f"image gen 无 candidates: {data}")
    candidate = candidates[0]
    reason = candidate.get("finishReason")
    if reason and reason not in ("STOP", "MAX_TOKENS"):
        raise RuntimeError(f"image gen rejected: {reason}")

    for part in candidate.get("content", {}).get("parts", []):
        inline = part.get("inlineData") or part.get("inline_data")
        if inline and inline.get("data"):
            return inline["data"]
    raise RuntimeError(f"image gen 返回无图像: {data}")
