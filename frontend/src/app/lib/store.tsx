import React, { createContext, useContext, useMemo, useState } from "react";
import { posters, type Poster } from "./content";
import { signOotd as apiSignOotd, rewordOotd as apiRewordOotd, getOotdDiary, type OotdEntry } from "./api";

export type TabKey = "today" | "closet" | "rx";

export type SavedOutfit = { posterId: string; picks: Record<string, string> };

/** 送花情绪推荐出的一套穿搭（套进处方海报模板：正面大片 / 背面排版） */
export type EmotionLook = {
  index: number;
  query: string;
  title: string;   // 海报大标题（jsonl 标题）
  desc: string;    // 海报说明（jsonl 说明）
  tags: string[];  // 海报标签（jsonl 关键词）
  reason: string;  // Claude 推荐理由
  look_name: string;
  front: string;   // 大片图（正面）
  back: string;    // 排版图（背面）
};

type Store = {
  tab: TabKey;
  setTab: (t: TabKey) => void;

  /** 明日试镜 */
  auditionOpen: boolean;
  openAudition: () => void;
  closeAudition: () => void;
  auditionDone: boolean;
  finishAudition: (posterId: string) => void;
  prescribedId: string | null;

  /** 处方 tab */
  activePosterId: string | null;
  focusPoster: (id: string) => void;

  /** 送花情绪推荐的穿搭（处方 tab 展示）；有值时处方 tab 显示这些 */
  emotionLooks: EmotionLook[];
  emotionMood: string;
  setEmotionLooks: (mood: string, looks: EmotionLook[]) => void;
  clearEmotionLooks: () => void;

  /** 音乐 */
  soundOn: boolean;
  enableSound: () => void;
  toggleSound: () => void;

  /** 收藏 / 我的角色库 */
  favorites: string[];
  toggleFavorite: (id: string) => void;

  /** 保存的明日穿搭 */
  savedOutfits: SavedOutfit[];
  saveOutfit: (o: SavedOutfit) => void;

  /** 今日复盘 */
  reviewChoice: string | null;
  setReviewChoice: (id: string) => void;

  /** 今日署名一张（Claude 读图） */
  /** 今天已署名的日记条目；有值即「已署名」 */
  todayOotd: OotdEntry | null;
  /** 全部署名日记（真实条目，供合并进日历 / 往期） */
  ootdDiary: OotdEntry[];
  /** 上传/读图中 */
  ootdSigning: boolean;
  /** 上传一张照片署名今天（拍照 or 本地文件） */
  signOotd: (file: File | Blob) => Promise<void>;
  /** 换一种说法：用当天照片重新生成一句话/词 */
  rewordOotd: () => Promise<void>;
  /** 拉取全部署名日记 + 今天的条目 */
  loadOotdDiary: () => Promise<void>;
  /** 撤下今天这一页，回到「尚未署名」（仅前端态，不删后端记录） */
  withdrawOotd: () => void;
  /** 是否已署名（由 todayOotd 派生），保留旧字段名给调用方 */
  ootdUploaded: boolean;

  posterById: (id: string | null) => Poster | undefined;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [tab, setTab] = useState<TabKey>("today");
  const [auditionOpen, setAuditionOpen] = useState(false);
  const [auditionDone, setAuditionDone] = useState(false);
  const [prescribedId, setPrescribedId] = useState<string | null>(null);
  const [activePosterId, setActivePosterId] = useState<string | null>(posters[0].id);
  const [soundOn, setSoundOn] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);
  const [reviewChoice, setReviewChoice] = useState<string | null>(null);
  const [todayOotd, setTodayOotd] = useState<OotdEntry | null>(null);
  const [ootdDiary, setOotdDiary] = useState<OotdEntry[]>([]);
  const [ootdSigning, setOotdSigning] = useState(false);
  /** 撤下后即使后端仍有今天的记录，也在本端隐藏为「尚未署名」 */
  const [ootdWithdrawn, setOotdWithdrawn] = useState(false);
  const [emotionLooks, setEmotionLooksState] = useState<EmotionLook[]>([]);
  const [emotionMood, setEmotionMood] = useState<string>("");

  /** 把一条日记合并进 diary 列表（同 day 覆盖），供动作复用 */
  const mergeEntry = (entry: OotdEntry) =>
    setOotdDiary((list) => [entry, ...list.filter((e) => e.day !== entry.day)]);

  const value = useMemo<Store>(
    () => ({
      tab,
      setTab,
      auditionOpen,
      openAudition: () => setAuditionOpen(true),
      closeAudition: () => setAuditionOpen(false),
      auditionDone,
      prescribedId,
      finishAudition: (posterId) => {
        setAuditionDone(true);
        setPrescribedId(posterId);
        setActivePosterId(posterId);
      },
      activePosterId,
      focusPoster: setActivePosterId,
      emotionLooks,
      emotionMood,
      setEmotionLooks: (mood, looks) => {
        setEmotionMood(mood);
        setEmotionLooksState(looks);
      },
      clearEmotionLooks: () => {
        setEmotionMood("");
        setEmotionLooksState([]);
      },
      soundOn,
      enableSound: () => setSoundOn(true),
      toggleSound: () => setSoundOn((s) => !s),
      favorites,
      toggleFavorite: (id) =>
        setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id])),
      savedOutfits,
      saveOutfit: (o) =>
        setSavedOutfits((list) => [...list.filter((x) => x.posterId !== o.posterId), o]),
      reviewChoice,
      setReviewChoice,
      todayOotd,
      ootdDiary,
      ootdSigning,
      signOotd: async (file) => {
        setOotdSigning(true);
        setOotdWithdrawn(false);
        try {
          const entry = await apiSignOotd(file);
          setTodayOotd(entry);
          mergeEntry(entry);
        } finally {
          setOotdSigning(false);
        }
      },
      rewordOotd: async () => {
        if (!todayOotd) return;
        setOotdSigning(true);
        try {
          const entry = await apiRewordOotd(todayOotd.iso);
          setTodayOotd(entry);
          mergeEntry(entry);
        } finally {
          setOotdSigning(false);
        }
      },
      loadOotdDiary: async () => {
        const { entries, today } = await getOotdDiary();
        setOotdDiary(entries);
        if (today && !ootdWithdrawn) setTodayOotd(today);
      },
      withdrawOotd: () => {
        setTodayOotd(null);
        setOotdWithdrawn(true);
      },
      ootdUploaded: todayOotd != null,
      posterById: (id) => posters.find((p) => p.id === id),
    }),
    [tab, auditionOpen, auditionDone, prescribedId, activePosterId, emotionLooks, emotionMood, soundOn, favorites, savedOutfits, reviewChoice, todayOotd, ootdDiary, ootdSigning, ootdWithdrawn],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
