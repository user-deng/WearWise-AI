/**
 * 前端数据层 —— 统一封装对后端 aidress_api 的调用。
 * 开发环境通过 vite dev proxy 把 /api、/img、/avatar 代理到 :8100。
 */
import type { ClosetItem } from "./content";

export type SortKey = "wears" | "idle" | "name";

/** 后端返回的衣橱单品（比前端 ClosetItem 多真实标签明细字段）。 */
export type ApiClosetItem = ClosetItem & {
  sku_id: string;
  sub?: string;
  season?: string;
  scene?: string;
  material?: string;
  style?: string;
  silhouette?: string;
  pattern?: string;
  description?: string;
};

export type InsightCard = {
  kind: "断舍离" | "焕新搭配" | "重复度";
  title: string;
  body: string;
  accent: string;
};

export type ClosetInsights = {
  generated_at: string;
  source: "claude" | "fallback";
  health_title: string;
  stats: {
    total: number;
    idle30: number;
    utilization: number;
    counts: { 常穿: number; 偶尔: number; 沉睡: number };
    health: number;
    top_color: string;
    color_ratio: number;
  };
  insights: InsightCard[];
};

export type LookRecommendation = {
  index: number;
  query: string;
  title: string;   // jsonl 标题
  desc: string;    // jsonl 说明
  tags: string[];  // jsonl 关键词
  reason: string;
  look_name: string;
  front: string;   // 大片图
  back: string;    // 排版图
};

export type EmotionResult = {
  generated_at: string;
  source: "claude" | "fallback";
  mood: string;
  recommendations: LookRecommendation[];
};

/** 今日署名一张：Claude 读图生成的一条情绪价值日记。 */
export type OotdEntry = {
  id: string;
  /** 真实日期 YYYY-MM-DD，用于精确定位照片（reword） */
  iso: string;
  /** 展示日期，形如 08.01 */
  date: string;
  /** 当月第几天，用于日历定位 */
  day: number;
  ep: string;
  /** 两个字的当日总结（日历格） */
  word: string;
  /** 一句话情绪价值评价 */
  line: string;
  keywords: string[];
  /** 短署名 */
  signature: string;
  /** 照片 URL（/ootd/<date>.jpg） */
  photo: string;
  generated_at: string;
  source: "claude" | "fallback";
};

export type Profile = {
  nickname: string;
  height: string;
  weight: string;
  age?: string;
  gender?: string;
  occupation?: string;
  bodyNotes: string;
  fileNo?: string;
  fullBody?: string;
};

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

/** 拉取衣橱列表（按大类过滤 + 排序）。 */
export async function getCloset(
  category = "全部",
  sort: SortKey = "idle",
): Promise<ApiClosetItem[]> {
  const q = new URLSearchParams({ category, sort });
  const data = await json<{ total: number; items: ApiClosetItem[] }>(
    await fetch(`/api/closet?${q.toString()}`),
  );
  return data.items;
}

/** 录入单品：上传一张图片 → 后端补全+打标+入库，返回新 item。 */
export async function intakeItem(file: File | Blob): Promise<ApiClosetItem> {
  const fd = new FormData();
  fd.append("file", file, "intake.jpg");
  return json<ApiClosetItem>(
    await fetch(`/api/closet/intake`, { method: "POST", body: fd }),
  );
}

/** 移到观察区（删除）。 */
export async function deleteItem(skuId: string): Promise<void> {
  await json(await fetch(`/api/closet/${skuId}`, { method: "DELETE" }));
}

/** 获取 AI 建议卡 + 统计（每天 0 点后台重算，这里读缓存）。 */
export async function getInsights(refresh = false): Promise<ClosetInsights> {
  return json<ClosetInsights>(
    await fetch(`/api/closet/insights${refresh ? "?refresh=1" : ""}`),
  );
}

/** 选花情绪 → Claude 推荐 5 个最相关穿搭 query（含穿搭图）。 */
export async function recommendByEmotion(
  emotions: string[],
  flowers: string[],
): Promise<EmotionResult> {
  return json<EmotionResult>(
    await fetch(`/api/emotion/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emotions, flowers }),
    }),
  );
}

export type MusicTrack = { title: string; url: string };

/** 背景音乐列表（音乐/ 目录）。 */
export async function getMusic(): Promise<MusicTrack[]> {
  const d = await json<{ tracks: MusicTrack[] }>(await fetch(`/api/music`));
  return d.tracks;
}

/* ─────────────── 今日：署名一张 ─────────────── */

/** 署名今天：上传一张当天穿搭照 → Claude 读图 → 返回一条日记条目。 */
export async function signOotd(file: File | Blob): Promise<OotdEntry> {
  const fd = new FormData();
  fd.append("file", file, "ootd.jpg");
  return json<OotdEntry>(
    await fetch(`/api/ootd/sign`, { method: "POST", body: fd }),
  );
}

/** 换一种说法：用当天已存照片重新生成一句话/词。date 为空表示今天。 */
export async function rewordOotd(date = ""): Promise<OotdEntry> {
  return json<OotdEntry>(
    await fetch(`/api/ootd/reword`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    }),
  );
}

/** 拉取全部署名日记（按 day 降序）+ 今天的条目。 */
export async function getOotdDiary(): Promise<{
  entries: OotdEntry[];
  today: OotdEntry | null;
}> {
  return json<{ entries: OotdEntry[]; today: OotdEntry | null }>(
    await fetch(`/api/ootd/diary`),
  );
}

/** 读取用户形象档案。 */
export async function getProfile(): Promise<Profile> {
  return json<Profile>(await fetch(`/api/profile`));
}

/** 仅更新档案文字信息。 */
export async function updateProfile(fields: Partial<Profile>): Promise<Profile> {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => {
    if (v != null) fd.append(k, String(v));
  });
  return json<Profile>(
    await fetch(`/api/profile`, { method: "POST", body: fd }),
  );
}

/** 上传 1~3 张参考图 + 资料 → 生成全身形象图。 */
export async function generateAvatar(
  files: File[],
  info: {
    gender?: string;
    height?: string;
    weight?: string;
    age?: string;
    occupation?: string;
    nickname?: string;
    bodyNotes?: string;
  },
): Promise<Profile> {
  const fd = new FormData();
  files.slice(0, 3).forEach((f) => fd.append("files", f, f.name || "ref.jpg"));
  Object.entries(info).forEach(([k, v]) => {
    if (v != null) fd.append(k, String(v));
  });
  return json<Profile>(
    await fetch(`/api/profile/avatar`, { method: "POST", body: fd }),
  );
}
