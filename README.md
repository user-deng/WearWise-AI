# WearWise AI · 有一套

> 不必迎合，你自有一套。
> Don't conform — wear your own story.

一款以「情绪价值」为核心的 AI 智能穿搭助手：理解你的衣橱、理解你的情绪、生成专属穿搭方案，并把每天的 OOTD 变成一段有温度的记录。

An emotion-driven AI wardrobe & outfit assistant that understands your closet, senses your mood, generates personalized outfit recommendations, and turns your daily OOTD into a meaningful diary.

[English](#english) | [中文](#中文)

---

## English

### Overview

**WearWise AI (有一套)** is a full-stack AI-powered wardrobe and outfit assistant. Instead of only "matching clothes", it focuses on **emotional value**: it senses how you feel today, understands what's already in your closet, and generates outfit suggestions that tell your story.

Core value propositions:

1. **Mood understanding** — combines schedule, weather, today's OOTD, a "flower-picking" mini game and historical feedback to infer the user's current emotional needs.
2. **Smart closet** — multi-modal AI recognizes category, color and silhouette from a photo, auto-completes a clean product-style image, and builds a searchable wardrobe inventory.
3. **Personalized styling** — generates and ranks outfit candidates based on body profile, dressing habits, current mood and past feedback.
4. **Emotional diary** — every "signed" daily photo is read by AI to produce a short, warm emotional-value note, forming an OOTD diary over time.

### Tech Stack

| Layer | Technologies |
|---|---|
| Backend | Python, FastAPI, Uvicorn |
| Database | PostgreSQL (structured data in JSONB + binary assets via Large Objects) |
| AI Gateway | Runway enterprise AI gateway — Anthropic-compatible Messages API (text/vision) & Google GenerateContent-compatible API (image generation) |
| Frontend | React 18, TypeScript, Vite |
| UI | Tailwind CSS, Radix UI, MUI icons, shadcn/ui-style components |
| Animation | Motion (Framer Motion family) |
| Tooling | npm / pnpm workspace |

> All AI calls go through an internal gateway — the project never talks to Anthropic/OpenAI/Google APIs directly, which keeps credentials centralized and auditable.

### Project Structure

```
aidress/
├── backend/                 # FastAPI service
│   ├── app.py                # API routes, SSO auth, static hosting for frontend dist
│   ├── store.py               # PostgreSQL persistence (JSONB tables + Large Objects for binaries)
│   ├── ai.py                  # AI gateway client (text/vision + image generation)
│   ├── intake.py               # Closet item intake: photo -> background cleanup -> tagging
│   ├── insights.py             # Closet analytics & AI-generated insight cards
│   ├── emotion.py              # Flower game -> mood analysis -> outfit recommendation
│   ├── ootd.py                 # Daily "signed" photo -> AI emotional-value diary entry
│   ├── avatar.py               # Reference photos + profile -> full-body avatar generation
│   ├── init_db.py              # DB schema creation + seed data loading
│   ├── requirements.txt
│   ├── assets/                 # Baseline model images for avatar generation
│   └── prompts/                # Prompt templates (tagging, background completion, avatar)
├── frontend/                 # React + Vite SPA
│   └── src/app/
│       ├── components/          # TodayTab, ClosetTab, PrescriptionTab, AuditionFlow, ui/ ...
│       └── lib/                 # api client, global store, weather hook, content constants
├── seed_data/                # Seed data for closet items, looks catalog, OOTD diary, music, etc.
├── data_export/               # Database export snapshot
├── install.sh                # Install dependencies + init DB + load seed data
├── start.sh                   # Start the FastAPI app (serves API + built frontend)
├── health.sh                  # Health check script
└── prepack.sh                 # Pre-packaging: rebuild frontend dist when needed
```

### Core Features

- **Closet management** (`/api/closet`, `/api/closet/intake`) — list/filter/sort items, upload & auto-tag new items, delete items.
- **Closet insights** (`/api/closet/insights`) — usage rate, idle-item detection, color-diversity suggestions, wardrobe health score; recalculated automatically every day at midnight.
- **Mood-based recommendation** (`/api/emotion/recommend`) — flower-picking mini game feeds an LLM to infer mood, then recommends outfit styles from a curated catalog with reasons.
- **OOTD diary** (`/api/ootd/sign`, `/api/ootd/diary`) — upload today's outfit/selfie photo, AI reads the image and writes a short emotional-value note (headline, 2-word summary, keywords, a short signature).
- **Avatar generation** (`/api/profile/avatar`) — combine reference photos with body profile (height/weight/age/etc.) to generate a full-body styled avatar image.
- **SSO-protected APIs** — all business routes require an authenticated user injected by the platform.

### Getting Started

**One-click deployment (target environment with `db.properties` / `ai.properties` already provisioned):**

```bash
bash install.sh   # install dependencies, init DB schema, load seed data
bash start.sh     # start the app (default: http://127.0.0.1:3000, configurable via $APP_PORT)
bash health.sh    # health check (used by the deploy platform)
```

**Local development:**

```bash
# Backend (http://127.0.0.1:8100)
cd backend
pip install -r requirements.txt
python3 -m uvicorn app:app --reload --port 8100

# Frontend (http://localhost:5173, proxies /api,/img,/avatar,/ootd to :8100)
cd frontend
npm install
npm run dev
```

### Configuration

> ⚠️ **No credentials are committed to this repository.** The files below are listed in `.gitignore` and must be created locally / injected by the deployment platform.

| File / Variable | Purpose |
|---|---|
| `db.properties` | PostgreSQL connection info (`db.host`, `db.port`, `db.database`, `db.username`, `db.password`) |
| `ai.properties` | AI gateway endpoint & credential (`ai.base_url`, `ai.api_key`) |
| `APP_PORT` | Backend listening port (default `3000`) |

If these are not configured, related API endpoints respond with `503` instead of failing silently.

### Data Model (PostgreSQL)

| Table | Purpose |
|---|---|
| `closet_items` | Wardrobe items — tags (JSONB), wear count, idle days, status, image reference |
| `profile` | User profile — name, height, weight, age, gender, notes, avatar URL |
| `ootd_diary` | Daily diary entries keyed by date |
| `insights_cache` | Cached wardrobe insight cards, refreshed daily |
| `files` | Binary asset index backed by PostgreSQL Large Objects (photos, avatars, generated images) |

### Notes

- This project is scaffolded for the **Cowork** deployment platform (`react-fastapi-monorepo` profile): the backend both serves the API and hosts the built frontend (`frontend/dist`) as a static SPA.
- All AI capabilities (vision tagging, mood inference, image completion/generation) are called through a centralized internal gateway rather than directly against third-party SDKs.

---

## 中文

### 项目简介

**WearWise AI（有一套）** 是一款以「情绪价值」为核心的全栈 AI 智能穿搭助手。它不止于"搭配衣服"，而是希望理解你今天的心情、理解你衣橱里已经拥有的东西，并给出真正属于你自己故事的穿搭方案。

核心价值：

1. **情绪理解**：融合日程、天气、今日 OOTD、"选花"小游戏与历史反馈，识别用户当下的状态和情绪价值需求。
2. **衣橱智能化**：多模态 AI 识别衣物的品类、颜色、版型，自动补全干净的白底图，建立可检索的智能衣橱库存。
3. **个性化搭配**：结合身材特征、穿衣习惯、当前情绪与历史反馈，生成候选穿搭方案并评分排序。
4. **情感日记**：每日"署名"照片经 AI 读图后生成一段有温度的情绪价值记录，日积月累形成 OOTD 日记。

### 技术栈

| 层级 | 技术 |
|---|---|
| 后端 | Python、FastAPI、Uvicorn |
| 数据库 | PostgreSQL（结构化数据用 JSONB，图片等二进制数据用 Large Object 存储） |
| AI 能力 | 通过 Runway 企业 AI 网关调用，兼容 Anthropic Messages 协议（文本/视觉）与 Google GenerateContent 协议（图像生成） |
| 前端 | React 18、TypeScript、Vite |
| UI | Tailwind CSS、Radix UI、MUI 图标、shadcn/ui 风格组件 |
| 动画 | Motion（Framer Motion 系列） |
| 工具链 | npm / pnpm workspace |

> 所有 AI 调用统一经过内部网关，不直连 Anthropic / OpenAI / Google 官方 SDK，便于凭证集中管理与用量审计。

### 目录结构

```
aidress/
├── backend/                 # FastAPI 后端服务
│   ├── app.py                 # API 路由、SSO 鉴权、托管前端静态资源
│   ├── store.py                # PostgreSQL 持久化层（JSONB 表 + Large Object 存二进制）
│   ├── ai.py                   # AI 网关调用封装（文本/视觉 + 图像生成）
│   ├── intake.py                # 衣物录入：拍照 → 背景处理/补全 → 标签识别
│   ├── insights.py              # 衣橱数据统计与 AI 生成的洞察卡片
│   ├── emotion.py               # 选花小游戏 → 情绪分析 → 穿搭推荐
│   ├── ootd.py                  # 每日署名照 → AI 生成情绪价值日记
│   ├── avatar.py                # 参考图 + 个人信息 → 生成全身形象图
│   ├── init_db.py               # 建表 + 灌入种子数据
│   ├── requirements.txt
│   ├── assets/                  # 用于形象生成的基准模型图
│   └── prompts/                 # 提示词模板（标签识别、背景补全、形象生成）
├── frontend/                 # React + Vite 单页应用
│   └── src/app/
│       ├── components/           # TodayTab、ClosetTab、PrescriptionTab、AuditionFlow、ui/ 等
│       └── lib/                  # API 客户端、全局状态、天气 Hook、业务常量
├── seed_data/                # 种子数据（衣橱库存、穿搭风格库、OOTD 日记、音乐等）
├── data_export/               # 数据库导出快照
├── install.sh                # 安装依赖 + 初始化数据库 + 灌入种子数据
├── start.sh                   # 启动 FastAPI 应用（同时提供 API 与前端静态资源）
├── health.sh                  # 健康检查脚本
└── prepack.sh                 # 打包前处理：按需重新构建前端 dist
```

### 核心功能

- **衣橱管理**（`/api/closet`、`/api/closet/intake`）：列表筛选/排序、上传并自动打标签、删除单品。
- **衣橱洞察**（`/api/closet/insights`）：启用率、闲置单品检测、颜色丰富度建议、衣橱健康度评分；每日 0 点自动重新计算。
- **情绪穿搭推荐**（`/api/emotion/recommend`）：通过"选花"小游戏采集情绪线索，交由大模型分析后从风格库中推荐若干套穿搭并给出理由。
- **OOTD 情感日记**（`/api/ootd/sign`、`/api/ootd/diary`）：上传当日穿搭/自拍照，AI 读图生成一句话点评、两字总结、关键词与一句短署名。
- **形象生成**（`/api/profile/avatar`）：结合参考图与身高体重年龄等身材信息，生成风格化的全身形象图。
- **SSO 鉴权**：所有业务接口都需要由平台注入的登录态，未登录返回 401。

### 快速开始

**一键部署（目标环境已配置好 `db.properties` / `ai.properties`）：**

```bash
bash install.sh   # 安装依赖、初始化数据库表结构、灌入种子数据
bash start.sh     # 启动应用（默认 http://127.0.0.1:3000，可用 $APP_PORT 指定端口）
bash health.sh    # 健康检查（供部署平台调用）
```

**本地开发：**

```bash
# 后端（http://127.0.0.1:8100）
cd backend
pip install -r requirements.txt
python3 -m uvicorn app:app --reload --port 8100

# 前端（http://localhost:5173，会将 /api、/img、/avatar、/ootd 代理到 :8100）
cd frontend
npm install
npm run dev
```

### 配置说明

> ⚠️ **本仓库不包含任何密钥/凭证。** 下列文件均已加入 `.gitignore`，需要在本地或部署平台上单独创建/注入。

| 文件 / 环境变量 | 用途 |
|---|---|
| `db.properties` | PostgreSQL 连接信息（`db.host`、`db.port`、`db.database`、`db.username`、`db.password`） |
| `ai.properties` | AI 网关地址与鉴权信息（`ai.base_url`、`ai.api_key`） |
| `APP_PORT` | 后端监听端口（默认 `3000`） |

若未配置以上信息，相关接口会直接返回 `503`，而不是静默失败。

### 数据模型（PostgreSQL）

| 表 | 说明 |
|---|---|
| `closet_items` | 衣橱单品 —— 标签（JSONB）、穿着次数、闲置天数、状态、图片引用 |
| `profile` | 用户档案 —— 昵称、身高、体重、年龄、性别、备注、形象图 URL |
| `ootd_diary` | 按日期存储的日记条目 |
| `insights_cache` | 衣橱洞察卡片缓存，每日自动刷新 |
| `files` | 二进制资源索引，底层为 PostgreSQL Large Object（照片、形象图、生成图等） |

### 说明

- 本项目基于 **Cowork** 部署平台的 `react-fastapi-monorepo` 脚手架规范搭建：后端既提供 API，也直接托管前端构建产物（`frontend/dist`）作为单页应用静态资源。
- 所有 AI 能力（视觉打标、情绪推断、图片补全/生成）均通过统一的内部网关调用，不直连第三方 SDK。
