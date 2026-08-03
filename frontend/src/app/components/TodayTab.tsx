import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Heart, ChevronRight, X, Undo2, RotateCcw, CalendarDays, Camera, ImageUp } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { CameraCapture } from "./CameraCapture";
import { Folio, MarginNote, Rule } from "./editorial";
import {
  archiveMonth,
  bouquets,
  cityLooks,
  flowerGame,
  diaryArchive,
  mergeDiary,
  photos,
  type CityLook,
  type DiaryEntry,
} from "../lib/content";
import { type OotdEntry } from "../lib/api";
import { useLiveWeather } from "../lib/useLiveWeather";
import { useStore } from "../lib/store";

const CARD_W = 262;
const CARD_H = 436;
/** 内容区一整页的宽度（390 − 左右 24 边距） */
const PAGE_W = 342;
/** 「我的」放大页的高度 */
const MY_H = 490;

export function TodayTab() {
  const {
    ootdUploaded,
    todayOotd,
    ootdDiary,
    ootdSigning,
    signOotd,
    rewordOotd,
    loadOotdDiary,
    withdrawOotd,
  } = useStore();
  /** idle → developing（暗房显影 / 上传读图中）→ done */
  const [phase, setPhase] = useState<"idle" | "developing" | "done">("idle");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  /** 上传等待期：刚选的那张本地预览图（objectURL），用于「冲洗中」浮层秒开 */
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [openEntry, setOpenEntry] = useState<DiaryEntry | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  /** 她们的拼版：点赞 / 印章 / 翻面 / 点开的那一张 */
  const [liked, setLiked] = useState<string[]>([]);
  const [stamp, setStamp] = useState<string | null>(null);
  const [flipped, setFlipped] = useState<string | null>(null);
  const [openLook, setOpenLook] = useState<CityLook | null>(null);

  /** 进入今日页时拉取历史署名，合并进日历 / 往期，并恢复今天已署名的那一页 */
  useEffect(() => {
    loadOotdDiary().catch(() => {
      /* 后端不可用时静默：往期回退到 mock */
    });
    // 仅首挂载拉一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 若已恢复出今天的条目，直接进入 done（显影完成态） */
  useEffect(() => {
    if (todayOotd && phase === "idle") setPhase("done");
  }, [todayOotd, phase]);

  const like = (id: string) => {
    const on = !liked.includes(id);
    setLiked((l) => (on ? [...l, id] : l.filter((x) => x !== id)));
    if (on) {
      setStamp(id);
      setTimeout(() => setStamp((s) => (s === id ? null : s)), 850);
    }
  };

  /** 选好照片（拍照 Blob / 本地文件）→ 上传后端 → Claude 读图 */
  const submitPhoto = async (file: File | Blob) => {
    setPickerOpen(false);
    setCameraOpen(false);
    setSignError(null);
    // 立刻用本地预览图垫上，避免上传等待期出现空白
    const preview = URL.createObjectURL(file);
    setPendingPreview(preview);
    setPhase("developing");
    try {
      await signOotd(file);
      setPhase("done");
    } catch (e) {
      setPhase("idle");
      setSignError(e instanceof Error ? e.message : "署名失败，请重试");
    } finally {
      setPendingPreview(null);
      URL.revokeObjectURL(preview);
    }
  };

  const reword = async () => {
    setPhase("developing");
    try {
      await rewordOotd();
    } finally {
      setPhase("done");
    }
  };

  const withdraw = () => {
    setPhase("idle");
    withdrawOotd();
  };

  return (
    <div className="relative h-full overflow-hidden bg-ivory">
      <div className="rx-hide-scroll relative h-full overflow-y-auto">
        <CoverBand />
        <div className="px-6 pb-10">
          <StreetModule
            uploaded={ootdUploaded}
            entry={todayOotd}
            phase={phase}
            diary={ootdDiary}
            onOpenPicker={() => setPickerOpen(true)}
            onReword={reword}
            onWithdraw={withdraw}
            onOpenEntry={setOpenEntry}
            onOpenCalendar={() => setCalendarOpen(true)}
            liked={liked}
            onOpenLook={(l) => {
              setFlipped(null);
              setOpenLook(l);
            }}
          />
          <AuditionEntry />
        </div>
      </div>

      {/* 署名卡：浮在整页之上，不推动版面 */}
      <SignatureCard
        open={pickerOpen}
        signing={ootdSigning}
        error={signError}
        onClose={() => setPickerOpen(false)}
        onShoot={() => {
          setPickerOpen(false);
          setCameraOpen(true);
        }}
        onFile={submitPhoto}
      />

      {/* 相机拍照浮层（前置人像）→ 拍下即上传署名 */}
      <AnimatePresence>
        {cameraOpen && (
          <CameraCapture
            facingMode="user"
            hint="把今天的自己放进取景框"
            onClose={() => setCameraOpen(false)}
            onShot={submitPhoto}
          />
        )}
      </AnimatePresence>

      {/* 冲洗中：上传 + AI 读图的等待浮层，先垫本地预览图再暗房显影 */}
      <DevelopingOverlay open={ootdSigning} preview={pendingPreview} />

      {/* 往期：单页放大 */}
      <DiaryDetail entry={openEntry} onClose={() => setOpenEntry(null)} />

      {/* 从拼版里点开的那一张：升起后可翻面看单品 */}
      <LookOverlay
        look={openLook}
        liked={openLook ? liked.includes(openLook.id) : false}
        stamped={openLook ? stamp === openLook.id : false}
        flipped={openLook ? flipped === openLook.id : false}
        onLike={() => openLook && like(openLook.id)}
        onFlip={() => openLook && setFlipped((f) => (f === openLook.id ? null : openLook.id))}
        onClose={() => {
          setFlipped(null);
          setOpenLook(null);
        }}
      />

      {/* 往期：日历总览 */}
      <ArchiveCalendar
        open={calendarOpen}
        diary={ootdDiary}
        onClose={() => setCalendarOpen(false)}
        onPick={(e) => {
          setCalendarOpen(false);
          setOpenEntry(e);
        }}
      />
    </div>
  );
}

/* ───────── 顶部杂志封面式背景带（无人物主视觉） ───────── */

function CoverBand() {
  const live = useLiveWeather();
  return (
    <header className="rx-grain relative w-full overflow-hidden bg-ivory-deep">
      {/* 柔和色块 + 面料局部裁切，构成不对称构图 */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[#e8e0d1]" />
        <div className="absolute right-0 top-0 h-full w-[46%] overflow-hidden">
          <ImageWithFallback
            src={photos.fabricLinen}
            alt="米色面料局部纹理"
            className="h-full w-full object-cover opacity-90"
          />
        </div>
      </div>

      <div className="relative flex items-center justify-between px-6 pb-3 pt-10">
        <div>
          <p className="font-display text-[14px] leading-none text-ink">穿搭灵感</p>
          <p className="mt-1 font-body text-[8px] uppercase rx-track text-ink/45">Style Inspo · Vol.07</p>
        </div>
        <div className="text-right">
          <p className="font-latin text-[12px] italic text-ink/60">{live.dateLatin}</p>
          <p className="mt-0.5 font-body text-[9px] rx-track-sm text-ink/45">
            {live.city} {live.temp} {live.cond}
          </p>
        </div>
      </div>
    </header>
  );
}

/* ───────── 模块一：今日的自己 → 横滑看她们（同一条街拍长廊） ───────── */

function StreetModule({
  uploaded,
  entry,
  phase,
  diary,
  onOpenPicker,
  onReword,
  onWithdraw,
  onOpenEntry,
  onOpenCalendar,
  liked,
  onOpenLook,
}: {
  uploaded: boolean;
  entry: OotdEntry | null;
  phase: "idle" | "developing" | "done";
  diary: OotdEntry[];
  onOpenPicker: () => void;
  onReword: () => void;
  onWithdraw: () => void;
  onOpenEntry: (e: DiaryEntry) => void;
  onOpenCalendar: () => void;
  liked: string[];
  onOpenLook: (l: CityLook) => void;
}) {
  const { favorites, toggleFavorite } = useStore();
  /** 0 = 我的这一页，1 = 她们的拼版 */
  const [page, setPage] = useState(0);
  const railRef = useRef<HTMLDivElement | null>(null);

  const onRailScroll = () => {
    const el = railRef.current;
    if (!el) return;
    setPage(el.scrollLeft > (PAGE_W + 14) / 2 ? 1 : 0);
  };

  const typed = useTypewriter(entry?.line ?? "", phase === "done", 42);

  return (
    <section className="relative pt-7">
      <ModuleHead
        index="01"
        title="今日的我们"
        note={
          uploaded
            ? "你的这一页已经署名。往右滑一页，是今天她们拼成的一张版。"
            : "先留下今天的 OOTD；往右滑一页，是今天她们拼成的一张版。"
        }
      />

      {/* 页眉：两页共用的刊头 */}
      <div className="mt-4 flex items-baseline justify-between">
        <div className="flex items-baseline gap-2 overflow-hidden">
          <span className="font-latin text-[12px] italic text-ink/35">
            {String(page + 1).padStart(2, "0")}/02
          </span>
          <AnimatePresence mode="wait">
            <motion.span
              key={page}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-[13px] text-ink"
            >
              {page === 0 ? (uploaded ? "我的这一页" : "我的这一页 · 尚未署名") : "她们的今天"}
            </motion.span>
          </AnimatePresence>
        </div>
        <span className="font-latin text-[11px] italic text-ink/40">
          {page === 0 ? "Mine" : `Contact sheet · ${cityLooks.length}`}
        </span>
      </div>

      {/* 两页横滑：我的放大页 → 她们的拼版 */}
      <div
        ref={railRef}
        onScroll={onRailScroll}
        className="rx-hide-scroll -mx-6 mt-2.5 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-6 pb-1"
      >
        <div className="shrink-0 snap-center" style={{ width: PAGE_W }}>
          <AnimatePresence mode="wait">
            {!uploaded ? (
              <motion.div
                key="unsigned"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <UnsignedPage onOpen={onOpenPicker} />
              </motion.div>
            ) : (
              <motion.div
                key="diary"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {entry && (
                  <DiarySpread
                    entry={entry}
                    phase={phase}
                    typed={typed}
                    collected={favorites.includes("diary-0731")}
                    onCollect={() => toggleFavorite("diary-0731")}
                    onReword={onReword}
                    onWithdraw={onWithdraw}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="shrink-0 snap-center" style={{ width: PAGE_W }}>
          <CollageSheet liked={liked} live={page === 1} onOpen={onOpenLook} />
        </div>
      </div>

      {/* 两页的刻度 */}
      <div className="mt-1.5 flex items-center gap-1.5">
        {[0, 1].map((i) => (
          <motion.span
            key={i}
            animate={{
              width: i === page ? 20 : 7,
              backgroundColor: i === page ? "var(--rx-ink)" : "rgba(20,17,15,0.18)",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="h-[2px]"
          />
        ))}
        <span className="ml-auto font-body text-[8px] uppercase rx-track text-ash">
          {page === 0 ? "Swipe →" : "Tap to open"}
        </span>
      </div>

      <PastStrip diary={diary} onOpenEntry={onOpenEntry} onOpenCalendar={onOpenCalendar} />
    </section>
  );
}

/* ── 她们的今天：拼版合集，点开其中一张 ── */

/** 不规则拼版：大图领衔，右侧两张叠成一列，下排两张平分（内容宽 324） */
const TILES = [
  { w: 190, h: 250 },
  { w: 126, h: 121 },
  { w: 126, h: 121 },
  { w: 158, h: 150 },
  { w: 158, h: 150 },
] as const;

function CollageSheet({
  liked,
  live,
  onOpen,
}: {
  liked: string[];
  live: boolean;
  onOpen: (l: CityLook) => void;
}) {
  return (
    <div className="relative bg-paper p-[9px]" style={{ height: MY_H }}>
      <div className="flex items-baseline justify-between px-[3px] pb-2">
        <span className="font-body text-[8px] uppercase rx-track text-ash">
          Today · {cityLooks.length} cities
        </span>
        <span className="font-latin text-[10px] italic text-ink/35">07.31</span>
      </div>

      {(() => {
        const tile = (i: number) => {
          const l = cityLooks[i];
          return (
            <Tile
              key={l.id}
              look={l}
              index={i}
              live={live}
              liked={liked.includes(l.id)}
              onOpen={() => onOpen(l)}
            />
          );
        };
        return (
          <>
            <div className="flex gap-[8px]">
              {tile(0)}
              <div className="flex flex-col gap-[8px]">
                {tile(1)}
                {tile(2)}
              </div>
            </div>
            <div className="mt-[8px] flex gap-[8px]">
              {tile(3)}
              {tile(4)}
            </div>
          </>
        );
      })()}

      <div className="mt-2.5 flex items-center gap-2 border-t border-ink/12 px-[3px] pt-2.5">
        <span className="font-display text-[12px] text-ink">今天她们都很好看。</span>
        <span className="h-px flex-1 bg-ink/12" />
        <span className="font-body text-[8px] uppercase rx-track text-ash">Tap any</span>
      </div>
    </div>
  );
}

function Tile({
  look,
  index,
  live,
  liked,
  onOpen,
}: {
  look: CityLook;
  index: number;
  live: boolean;
  liked: boolean;
  onOpen: () => void;
}) {
  const t = TILES[index];

  return (
    <motion.button
      onClick={onOpen}
      initial={{ opacity: 0, y: 14 }}
      animate={live ? { opacity: 1, y: 0 } : { opacity: 0.001, y: 14 }}
      transition={{ delay: live ? index * 0.06 : 0, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.975 }}
      className="group relative shrink-0 overflow-hidden text-left"
      style={{ width: t.w, height: t.h }}
    >
      <motion.div
        className="absolute inset-0"
        whileHover={{ scale: 1.04 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <ImageWithFallback
          src={look.photo}
          alt={`${look.city} · ${look.nickname}的今日穿搭`}
          className="h-full w-full object-cover"
        />
      </motion.div>

      {/* 压在图上的城市与编号，克制的杂志标注 */}
      <span className="absolute left-0 top-0 bg-ivory/92 px-1.5 py-[3px] font-body text-[8px] rx-track-sm text-ink">
        {look.city}
      </span>
      <span className="absolute bottom-1.5 left-2 font-latin text-[11px] italic text-ivory/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
        {look.nickname}
      </span>
      {liked && (
        <span className="absolute right-1.5 top-1.5">
          <Heart className="h-3 w-3 fill-wine text-wine" strokeWidth={1.4} />
        </span>
      )}
      <span className="absolute bottom-0 right-0 bg-ink px-1.5 py-[2px] font-latin text-[9px] italic text-ivory">
        {String(index + 1).padStart(2, "0")}
      </span>
    </motion.button>
  );
}

/* ── 点开的一张：从拼版里升起，再翻面看单品 ── */

function LookOverlay({
  look,
  liked,
  stamped,
  flipped,
  onLike,
  onFlip,
  onClose,
}: {
  look: CityLook | null;
  liked: boolean;
  stamped: boolean;
  flipped: boolean;
  onLike: () => void;
  onFlip: () => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {look && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          className="absolute inset-0 z-[60] flex items-center justify-center"
        >
          <button onClick={onClose} aria-label="关闭" className="absolute inset-0 bg-ink/60" />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 22, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            className="relative"
            style={{ width: CARD_W }}
          >
            <div className="mb-2 flex items-baseline justify-between">
              <span className="font-body text-[8px] uppercase rx-track text-ivory/70">
                {look.city} / Today
              </span>
              <button onClick={onClose} className="p-0.5 text-ivory/70 active:opacity-50">
                <X className="h-4 w-4" strokeWidth={1.3} />
              </button>
            </div>
            <CityCard
              look={look}
              index={cityLooks.findIndex((c) => c.id === look.id)}
              interactive
              liked={liked}
              stamped={stamped}
              flipped={flipped}
              onLike={onLike}
              onFlip={onFlip}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── 上传前：一页未署名的空版面 ── */

function UnsignedPage({ onOpen }: { onOpen: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.99 }}
      onClick={onOpen}
      className="rx-grain group relative block w-full overflow-hidden text-left"
      style={{
        height: MY_H,
        background:
          "linear-gradient(158deg, var(--rx-paper) 0%, var(--rx-ivory) 46%, var(--rx-ivory-deep) 100%)",
      }}
    >
      {/* 柔光与色块：让空页也有构图 */}
      <span className="pointer-events-none absolute -right-8 -top-10 h-[190px] w-[190px] rounded-full bg-blush/30 blur-[2px]" />
      <span className="pointer-events-none absolute bottom-[86px] -left-6 h-[120px] w-[120px] rounded-full bg-sage/25 blur-[2px]" />
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 70% at 50% 20%, rgba(255,253,248,0.5), transparent 60%)",
        }}
      />

      {/* 装裱内框 */}
      <span className="absolute inset-[13px] border border-ink/12" />

      {/* 竖排刊头 */}
      <span className="rx-vertical absolute left-[26px] top-[30px] font-body text-[8px] rx-track text-ink/40">
        TODAY · 07.31
      </span>
      <span className="absolute right-[24px] top-[28px] font-latin text-[11px] italic text-ink/40">
        Issue 07
      </span>

      {/* 中心：相机光圈 —— 六片叶轮缓缓转动 */}
      <span className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2">
        <motion.span
          className="relative block h-[128px] w-[128px] rounded-full border border-ink/18"
          animate={{ rotate: 360 }}
          transition={{ duration: 44, repeat: Infinity, ease: "linear" }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className="absolute left-1/2 top-1/2 h-[62px] w-px origin-top bg-ink/12"
              style={{ transform: `rotate(${i * 60}deg)` }}
            />
          ))}
        </motion.span>
        {/* 呼吸圈 */}
        <motion.span
          className="absolute left-1/2 top-1/2 block h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink/25"
          animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* 快门核心 */}
        <span className="absolute left-1/2 top-1/2 flex h-[46px] w-[46px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink">
          <span className="font-body text-[9px] rx-track-sm text-ivory">＋</span>
        </span>
      </span>

      {/* 文案 */}
      <span className="absolute inset-x-[36px] bottom-[104px] text-center">
        <span className="block font-display text-[19px] leading-[1.5] text-ink">
          留下今天的样子
        </span>
        <span className="mt-1.5 block font-latin text-[11px] italic text-ash">
          Sign today&rsquo;s page.
        </span>
      </span>

      {/* CTA 胶囊 */}
      <span className="absolute inset-x-[36px] bottom-[46px] flex justify-center">
        <motion.span
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          className="inline-flex items-center gap-2 border border-ink/80 bg-ink px-6 py-2.5 font-body text-[10px] rx-track-sm text-ivory"
        >
          此刻署名一张
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.4} />
        </motion.span>
      </span>

      <span className="absolute bottom-[18px] right-[22px] font-latin text-[10px] italic text-ink/35">
        p. 01
      </span>
    </motion.button>
  );
}

/* ── 署名卡：浮出的卡片，不推动页面 ── */

function SignatureCard({
  open,
  signing,
  error,
  onClose,
  onShoot,
  onFile,
}: {
  open: boolean;
  signing: boolean;
  error: string | null;
  onClose: () => void;
  /** 此刻拍一张 → 打开相机 */
  onShoot: () => void;
  /** 从本地文件夹选一张 → 直接上传 */
  onFile: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = ""; // 允许再次选同一文件
    if (f) onFile(f);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 flex items-center justify-center"
        >
          <button
            onClick={onClose}
            aria-label="关闭"
            className="absolute inset-0 bg-ink/45 backdrop-blur-[1px]"
          />
          <motion.div
            initial={{ opacity: 0, y: 22, scale: 0.96, rotate: -1.2 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, y: 14, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="rx-grain relative w-[300px] bg-paper p-5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.55)]"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-display text-[17px] leading-none text-ink">为今天署名</p>
                <p className="mt-1.5 font-latin text-[11px] italic text-ash">Sign this page</p>
              </div>
              <button onClick={onClose} className="p-1 text-ink/45 active:opacity-50">
                <X className="h-4 w-4" strokeWidth={1.3} />
              </button>
            </div>

            {/* 隐藏的文件输入：手机端会同时给出拍照/相册，桌面端选本地文件 */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={pick}
            />

            <div className="mt-4 border-t border-ink/15">
              <button
                onClick={onShoot}
                disabled={signing}
                className="flex w-full items-center justify-between border-b border-ink/10 py-3.5 text-left active:opacity-50 disabled:opacity-40"
              >
                <span className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-ink/70" strokeWidth={1.4} />
                  <span className="font-display text-[15px] text-ink">此刻拍一张</span>
                </span>
                <span className="font-latin text-[10px] italic text-ash">shutter</span>
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={signing}
                className="flex w-full items-center justify-between py-3.5 text-left active:opacity-50 disabled:opacity-40"
              >
                <span className="flex items-center gap-2">
                  <ImageUp className="h-4 w-4 text-ink/70" strokeWidth={1.4} />
                  <span className="font-display text-[15px] text-ink">从相册 / 文件里挑</span>
                </span>
                <span className="font-latin text-[10px] italic text-ash">camera roll</span>
              </button>
            </div>

            <p className="mt-3 font-body text-[10px] leading-[1.9] text-ash">
              {signing
                ? "正在上传，交给 AI 读一读今天的你……"
                : error
                  ? error
                  : "选好后，AI 会读这张照片，为你写下今天的一句话。"}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── 冲洗中：上传 + AI 读图的等待浮层 ── */

function DevelopingOverlay({
  open,
  preview,
}: {
  open: boolean;
  preview: string | null;
}) {
  /** 循环切换的状态文案，给用户「事情在推进」的反馈 */
  const STEPS = ["正在冲洗这张照片…", "AI 正在读今天的你…", "在为你写下今天的一句话…"];
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) {
      setStep(0);
      return;
    }
    const t = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 1600);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 z-[65] flex flex-col items-center justify-center bg-ink"
        >
          {/* 底层：刚拍/选的那张，压暗做显影底片 */}
          {preview && (
            <motion.div
              className="absolute inset-0"
              initial={{ filter: "brightness(2.4) contrast(0.3) saturate(0.1)", opacity: 0.35 }}
              animate={{
                filter: [
                  "brightness(2.4) contrast(0.3) saturate(0.1)",
                  "brightness(1.1) contrast(0.9) saturate(0.85)",
                  "brightness(2.4) contrast(0.3) saturate(0.1)",
                ],
                opacity: [0.35, 0.6, 0.35],
              }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <ImageWithFallback src={preview} alt="正在冲洗" className="h-full w-full object-cover" />
            </motion.div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/50" />
          <div className="rx-grain absolute inset-0" />

          {/* 中心：旋转光圈 + 呼吸圈（沿用未署名页的相机语言） */}
          <div className="relative flex flex-col items-center">
            <span className="relative block h-[104px] w-[104px]">
              <motion.span
                className="absolute inset-0 rounded-full border border-ivory/25"
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <span
                    key={i}
                    className="absolute left-1/2 top-1/2 h-[50px] w-px origin-top bg-ivory/20"
                    style={{ transform: `rotate(${i * 60}deg)` }}
                  />
                ))}
              </motion.span>
              <motion.span
                className="absolute left-1/2 top-1/2 block h-[62px] w-[62px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-ivory/35"
                animate={{ scale: [1, 1.15, 1], opacity: [0.45, 0.9, 0.45] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
              {/* 进度点绕圈 */}
              <motion.span
                className="absolute left-1/2 top-1/2 h-[104px] w-[104px] -translate-x-1/2 -translate-y-1/2"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              >
                <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-blush" />
              </motion.span>
            </span>

            {/* 状态文案：循环切换 */}
            <div className="mt-7 h-[18px] overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={step}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.35 }}
                  className="font-display text-[14px] text-ivory"
                >
                  {STEPS[step]}
                </motion.p>
              </AnimatePresence>
            </div>
            <p className="mt-2 font-latin text-[11px] italic text-ivory/50">Developing…</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── 上传后：杂志内页（含暗房显影） ── */

function DiarySpread({
  entry,
  phase,
  typed,
  collected,
  onCollect,
  onReword,
  onWithdraw,
}: {
  entry: OotdEntry;
  phase: "idle" | "developing" | "done";
  typed: string;
  collected: boolean;
  onCollect: () => void;
  onReword: () => void;
  onWithdraw: () => void;
}) {
  const developing = phase === "developing";
  const first = entry.line.slice(0, 1);

  return (
    <figure
      className="relative flex flex-col overflow-hidden bg-paper"
      style={{ height: MY_H }}
    >
      {/* 装裱白边 */}
      <div className="p-[13px] pb-0">
        <div className="relative h-[300px] overflow-hidden bg-ivory-deep">
          <motion.div
            className="absolute inset-0"
            initial={{ filter: "brightness(2.6) contrast(0.28) saturate(0.1)", opacity: 0.25 }}
            animate={
              developing
                ? { filter: "brightness(2.6) contrast(0.28) saturate(0.1)", opacity: 0.25 }
                : { filter: "brightness(1) contrast(1) saturate(1)", opacity: 1 }
            }
            transition={{ duration: 1.9, ease: "easeOut" }}
          >
            <ImageWithFallback src={entry.photo} alt="今日 OOTD" className="h-full w-full object-contain" />
          </motion.div>

          {/* 显影中的暗房提示 */}
          <AnimatePresence>
            {developing && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.4, 1, 0.4] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="rx-vertical absolute bottom-3 left-3 font-body text-[8px] rx-track text-ink/55"
              >
                DEVELOPING
              </motion.span>
            )}
          </AnimatePresence>

          <span className="rx-vertical absolute right-3 top-3 font-body text-[8px] rx-track text-ivory/85">
            {entry.date.replace(".", " · ")}
          </span>
        </div>
      </div>

      {/* 引文 */}
      <div className="flex-1 px-[13px] pt-4">
        {phase === "done" ? (
          <p className="font-display text-[14.5px] leading-[2] text-ink">
            <span className="float-left mr-1.5 mt-[5px] font-display text-[38px] leading-[0.78] text-blush-deep">
              {first}
            </span>
            {typed.slice(1)}
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.7, repeat: Infinity }}
              className="ml-[1px] inline-block h-[12px] w-[1px] translate-y-[2px] bg-ink/60"
            />
          </p>
        ) : (
          <p className="font-latin text-[13px] italic leading-[1.9] text-ash">
            正在显影 — 让它慢一点。
          </p>
        )}

        {phase === "done" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="mt-3 flex items-baseline gap-2 border-t border-ink/12 pt-2.5"
          >
            {entry.keywords.map((k, i) => (
              <React.Fragment key={k}>
                {i > 0 && <span className="h-[10px] w-px bg-ink/20" />}
                <span className="font-display text-[12px] text-ink">{k}</span>
              </React.Fragment>
            ))}
          </motion.div>
        )}
      </div>

      {/* 页脚：署名 · 收录 · 撤下 */}
      {phase === "done" && (
        <motion.figcaption
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="flex items-end justify-between border-t border-ink/12 px-[13px] py-3"
        >
          <div>
            <p className="font-latin text-[11px] italic text-ink/55">《{entry.signature}》</p>
            <div className="mt-1 flex items-center gap-3">
              <button
                onClick={onReword}
                className="font-body text-[9px] rx-track-sm text-ash underline decoration-ink/20 underline-offset-4 active:opacity-50"
              >
                换一种说法
              </button>
              <button
                onClick={onWithdraw}
                className="flex items-center gap-1 font-body text-[9px] rx-track-sm text-ash active:opacity-50"
              >
                <Undo2 className="h-3 w-3" strokeWidth={1.4} />
                撤下这一页
              </button>
            </div>
          </div>

          {/* 印章 */}
          <button onClick={onCollect} className="relative h-[46px] w-[46px] active:opacity-70">
            <motion.span
              animate={collected ? { rotate: -9, scale: 1 } : { rotate: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 300, damping: 16 }}
              className={`absolute inset-0 flex flex-col items-center justify-center rounded-full border ${
                collected ? "border-wine text-wine" : "border-ink/25 text-ink/45"
              }`}
            >
              <span className="font-display text-[12px] leading-none">{collected ? "已收" : "收录"}</span>
              <span className="mt-[3px] font-body text-[6px] rx-track">EP.017</span>
            </motion.span>
          </button>
        </motion.figcaption>
      )}
    </figure>
  );
}

/* ── 她们的一页：可翻转，背面是单品清单 ── */

function CityCard({
  look,
  index,
  interactive,
  liked,
  stamped,
  flipped,
  onLike,
  onFlip,
}: {
  look: CityLook;
  index: number;
  /** 只有滑到的那一页可以翻面 / 点赞 */
  interactive: boolean;
  liked: boolean;
  stamped: boolean;
  flipped: boolean;
  onLike: () => void;
  onFlip: () => void;
}) {
  return (
    <div
      style={{ height: CARD_H, perspective: 1600 }}
      className={interactive ? "" : "pointer-events-none"}
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* 正面 */}
        <div
          className="absolute inset-0 border border-ink/12 bg-paper"
          style={{ backfaceVisibility: "hidden" }}
        >
          <button onClick={onFlip} className="block w-full text-left">
            <div className="relative h-[286px] overflow-hidden">
              <ImageWithFallback
                src={look.photo}
                alt={`${look.city}用户街拍`}
                className="h-full w-full object-cover"
              />
              <span className="absolute left-0 top-0 bg-ivory px-2 py-1 font-body text-[8px] rx-track-sm text-ink">
                {look.city}
              </span>
              <span className="absolute bottom-0 right-0 bg-ink px-1.5 py-1 font-latin text-[10px] italic text-ivory">
                {String(index + 1).padStart(2, "0")}
              </span>

              {/* 点赞印章动效 */}
              <AnimatePresence>
                {stamped && (
                  <motion.span
                    initial={{ opacity: 0, scale: 1.7, rotate: -22 }}
                    animate={{ opacity: 1, scale: 1, rotate: -12 }}
                    exit={{ opacity: 0, scale: 1.08 }}
                    transition={{ duration: 0.34 }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-wine px-3 py-1.5 font-display text-[15px] text-wine"
                    style={{ background: "rgba(242,237,227,0.82)" }}
                  >
                    很好看
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </button>

          <div className="p-3">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 shrink-0 overflow-hidden rounded-full border border-ink/15">
                <ImageWithFallback src={look.avatar} alt={look.nickname} className="h-full w-full object-cover" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-[12px] text-ink">{look.nickname}</span>
                <span className="block font-body text-[8px] rx-track-sm text-ash">{look.city}</span>
              </span>
              <button onClick={onLike} className="flex items-center gap-1 p-1 active:opacity-50">
                <motion.span animate={liked ? { scale: [1, 1.35, 1] } : {}} transition={{ duration: 0.35 }}>
                  <Heart
                    className={`h-3.5 w-3.5 ${liked ? "fill-wine text-wine" : "text-ink/45"}`}
                    strokeWidth={1.4}
                  />
                </motion.span>
                <span className={`font-body text-[10px] ${liked ? "text-wine" : "text-ash"}`}>
                  {look.likes + (liked ? 1 : 0)}
                </span>
              </button>
            </div>
            <p className="mt-2.5 border-t border-ink/10 pt-2.5 font-display text-[12px] leading-[1.7] text-ink-soft">
              {look.caption}
            </p>
            <button
              onClick={onFlip}
              className="mt-2.5 flex items-center gap-1 font-body text-[9px] rx-track-sm text-ash active:opacity-50"
            >
              翻面看单品
              <ChevronRight className="h-3 w-3" strokeWidth={1.3} />
            </button>
          </div>
        </div>

        {/* 背面：白底单品清单 */}
        <div
          className="absolute inset-0 flex flex-col border border-ink/12 bg-white"
          style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}
        >
          <div className="flex items-start justify-between border-b border-ink/15 px-3.5 pb-2.5 pt-3.5">
            <div>
              <p className="font-body text-[8px] uppercase rx-track text-ash">Look sheet</p>
              <p className="mt-1 font-display text-[14px] leading-none text-ink">
                {look.nickname}的这一套
              </p>
            </div>
            <span className="font-latin text-[10px] italic text-ink/40">
              {look.city} / {String(index + 1).padStart(2, "0")}
            </span>
          </div>

          <div className="rx-hide-scroll flex-1 overflow-y-auto px-3.5">
            {look.items.map((it, i) => (
              <motion.div
                key={it.slot + it.name}
                initial={{ opacity: 0, y: 8 }}
                animate={flipped ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                transition={{ delay: flipped ? 0.42 + i * 0.07 : 0, duration: 0.35 }}
                className="flex items-center gap-3 border-b border-ink/10 py-2.5"
              >
                <span className="font-latin text-[11px] italic text-ink/35">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="h-[52px] w-[42px] shrink-0 overflow-hidden bg-[#f4f2ee]">
                  <ImageWithFallback src={it.image} alt={it.name} className="h-full w-full object-cover" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-body text-[8px] rx-track-sm text-ash">{it.slot}</span>
                  <span className="mt-1 block truncate font-display text-[12.5px] text-ink">{it.name}</span>
                  <span className="mt-0.5 block truncate font-body text-[9px] text-ash">{it.note}</span>
                </span>
                <span
                  className={`shrink-0 border px-1.5 py-[3px] font-body text-[8px] rx-track-sm ${
                    it.owned ? "border-sage-deep/50 text-sage-deep" : "border-wine/45 text-wine"
                  }`}
                >
                  {it.owned ? "衣橱已有" : "建议替换"}
                </span>
              </motion.div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-ink/15 px-3.5 py-2.5">
            <p className="font-body text-[9px] leading-[1.8] text-ash">
              共 {look.items.length} 件 · 其中{" "}
              {look.items.filter((i) => i.owned).length} 件你也有。
            </p>
            <button
              onClick={onFlip}
              className="flex items-center gap-1 font-body text-[9px] rx-track-sm text-ink active:opacity-50"
            >
              <RotateCcw className="h-3 w-3" strokeWidth={1.4} />
              翻回照片
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ── 往期胶片条 ── */

function PastStrip({
  diary,
  onOpenEntry,
  onOpenCalendar,
}: {
  diary: OotdEntry[];
  onOpenEntry: (e: DiaryEntry) => void;
  onOpenCalendar: () => void;
}) {
  // 真实署名条目按日期覆盖 mock 往期，取前 10 张
  const strip = mergeDiary(diaryArchive, diary).slice(0, 10);
  return (
    <div className="mt-6">
      <div className="flex items-center gap-3">
        <span className="font-body text-[8px] uppercase rx-track text-ash">往期 / Back issues</span>
        <span className="h-px flex-1 bg-ink/12" />
        <span className="font-latin text-[10px] italic text-ink/35">{strip.length}</span>
      </div>
      <div className="rx-hide-scroll -mx-6 mt-2.5 flex gap-2 overflow-x-auto scroll-px-6 px-6 pb-1 [scroll-snap-type:none] [-webkit-overflow-scrolling:touch]">
        {strip.map((d) => (
          <button
            key={d.id}
            onClick={() => onOpenEntry(d)}
            className="w-[62px] shrink-0 text-left active:opacity-60"
          >
            <div className="h-[74px] overflow-hidden">
              <ImageWithFallback
                src={d.photo}
                alt={`${d.ep} 往期日记`}
                className="h-full w-full object-cover opacity-65 grayscale"
              />
            </div>
            <p className="mt-1 font-latin text-[9px] italic text-ash">{d.date}</p>
            <p className="font-display text-[11px] leading-tight text-ink/70">{d.word}</p>
          </button>
        ))}

        {/* 查看更多 → 日历 */}
        <button
          onClick={onOpenCalendar}
          className="flex w-[62px] shrink-0 flex-col items-start active:opacity-60"
        >
          <span className="flex h-[74px] w-full items-center justify-center border border-ink/15 bg-paper">
            <CalendarDays className="h-4 w-4 text-ink/45" strokeWidth={1.3} />
          </span>
          <span className="mt-1 font-latin text-[9px] italic text-ash">more</span>
          <span className="font-display text-[11px] leading-tight text-ink/70">查看更多</span>
        </button>
      </div>
    </div>
  );
}

/* ── 往期单页：放大的 OOTD + 当日那段话 ── */

function DiaryDetail({ entry, onClose }: { entry: DiaryEntry | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {entry && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex items-center justify-center"
        >
          <button onClick={onClose} aria-label="关闭" className="absolute inset-0 bg-ink/60" />
          <motion.figure
            initial={{ opacity: 0, y: 26, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 240, damping: 25 }}
            className="rx-grain relative w-[318px] bg-paper shadow-[0_36px_70px_-24px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-start justify-between px-4 pb-2.5 pt-4">
              <div>
                <p className="font-body text-[8px] uppercase rx-track text-ash">{entry.ep}</p>
                <p className="mt-1 font-display text-[19px] leading-none text-ink">
                  {entry.word}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-latin text-[12px] italic text-ink/45">{entry.date}</span>
                <button onClick={onClose} className="p-0.5 text-ink/45 active:opacity-50">
                  <X className="h-4 w-4" strokeWidth={1.3} />
                </button>
              </div>
            </div>

            <div className="px-3">
              <div className="h-[352px] overflow-hidden bg-ivory-deep">
                <ImageWithFallback
                  src={entry.photo}
                  alt={`${entry.date} 的 OOTD`}
                  className="h-full w-full object-contain"
                />
              </div>
            </div>

            <figcaption className="px-4 pb-4 pt-3.5">
              <p className="font-display text-[13.5px] leading-[2] text-ink">
                <span className="float-left mr-1.5 mt-[5px] font-display text-[38px] leading-[0.78] text-blush-deep">
                  {entry.line.slice(0, 1)}
                </span>
                {entry.line.slice(1)}
              </p>
              <p className="mt-3 border-t border-ink/12 pt-2.5 font-body text-[9px] rx-track-sm text-ash">
                当日情绪记录 · 由这张照片生成
              </p>
            </figcaption>
          </motion.figure>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── 查看更多：日历总览，日期上是两个字的总结 ── */

function ArchiveCalendar({
  open,
  diary,
  onClose,
  onPick,
}: {
  open: boolean;
  diary: OotdEntry[];
  onClose: () => void;
  onPick: (e: DiaryEntry) => void;
}) {
  // 真实署名条目按日期覆盖 mock，填进对应日期格
  const byDay = new Map(mergeDiary(diaryArchive, diary).map((d) => [d.day, d]));
  const first = new Date(archiveMonth.year, archiveMonth.month - 1, 1).getDay();
  const total = new Date(archiveMonth.year, archiveMonth.month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: first }, () => null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex items-end"
        >
          <button onClick={onClose} aria-label="关闭" className="absolute inset-0 bg-ink/55" />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 250, damping: 28 }}
            className="rx-grain relative w-full bg-paper pb-6"
          >
            <div className="flex items-end justify-between border-b border-ink/15 px-5 pb-3 pt-5">
              <div>
                <p className="font-body text-[8px] uppercase rx-track text-ash">Archive</p>
                <p className="mt-1.5 font-display text-[21px] leading-none text-ink">
                  {archiveMonth.label}
                </p>
                <p className="mt-1.5 font-body text-[10px] leading-[1.8] text-ash">
                  每一天，两个字 · 点开看当天的 OOTD。
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-latin text-[11px] italic text-ink/40">
                  {archiveMonth.latin}
                </span>
                <button onClick={onClose} className="p-0.5 text-ink/45 active:opacity-50">
                  <X className="h-4 w-4" strokeWidth={1.3} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-ink/10 px-4 py-2">
              {["日", "一", "二", "三", "四", "五", "六"].map((w) => (
                <span key={w} className="text-center font-body text-[8px] rx-track-sm text-ash">
                  {w}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-px bg-ink/10 px-4 py-4">
              {cells.map((day, i) => {
                const entry = day ? byDay.get(day) : undefined;
                return (
                  <button
                    key={i}
                    disabled={!entry}
                    onClick={() => entry && onPick(entry)}
                    className={`flex h-[46px] flex-col items-center justify-center bg-paper ${
                      entry ? "active:bg-ivory-deep" : ""
                    }`}
                  >
                    {day && (
                      <>
                        <span
                          className={`font-latin text-[10px] italic ${
                            entry ? "text-ink/45" : "text-ink/20"
                          }`}
                        >
                          {day}
                        </span>
                        {entry ? (
                          <span className="mt-0.5 font-display text-[11px] leading-none text-ink">
                            {entry.word}
                          </span>
                        ) : (
                          <span className="mt-1 h-px w-2.5 bg-ink/15" />
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="px-5 font-body text-[9px] rx-track-sm text-ash">
              已记录 {diaryArchive.length} 天 · 空白的日子也算过去了。
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** 逐字打出 */
function useTypewriter(text: string, on: boolean, speed = 40) {
  const [n, setN] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!on) {
      setN(0);
      return;
    }
    setN(0);
    timer.current = setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          if (timer.current) clearInterval(timer.current);
          return v;
        }
        return v + 1;
      });
    }, speed);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [text, on, speed]);

  return text.slice(0, n);
}

/* ───────── 模块二：送自己一束花（入口位置沿用原【明日试镜】） ───────── */

function AuditionEntry() {
  const { openAudition, auditionDone } = useStore();

  return (
    <section className="pt-9">
      <ModuleHead
        index="02"
        title="今天，也值得被送一束花。"
        note={flowerGame.entryNote}
      />

      <motion.button
        whileTap={{ scale: 0.985 }}
        onClick={openAudition}
        className="rx-grain relative mt-4 block h-[212px] w-full overflow-hidden bg-paper text-left"
      >
        {/* 手绘花束：右侧留白，构图不对称 */}
        <div className="absolute inset-y-0 right-0 flex w-[46%] items-center justify-center overflow-hidden pr-3">
          <ImageWithFallback
            src={bouquets[0].photo}
            alt="手绘花束"
            className="h-[86%] w-full object-contain"
          />
        </div>
        {/* 柔和光与色块 */}
        <div className="absolute bottom-0 left-0 h-[34%] w-[26%] bg-blush/35" />
        <div className="absolute bottom-[16%] left-[22%] h-[12%] w-[9%] bg-sage/30" />

        <div className="relative flex h-full w-[62%] flex-col justify-between p-5">
          <span className="self-start border border-ink/25 px-2 py-[3px] font-body text-[8px] rx-track-sm text-ink/70">
            A BOUQUET · TODAY
          </span>

          <div>
            <h3 className="font-display text-[26px] leading-[1.32] text-ink">
              {flowerGame.title}
              <span className="ml-2 font-latin text-[13px] italic text-ash">Flowers</span>
            </h3>
            <p className="mt-2 font-body text-[11px] leading-[1.85] text-ash">
              {flowerGame.subtitle}
            </p>
            <span className="mt-3.5 inline-flex items-center gap-1.5 font-body text-[10px] rx-track-sm text-ink">
              {auditionDone ? "已收下今天的花 · 再看一次" : flowerGame.cta}
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.3} />
            </span>
          </div>
        </div>
      </motion.button>
    </section>
  );
}

/* ───────── 模块标题 ───────── */

function ModuleHead({ index, title, note }: { index: string; title: string; note: string }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="font-latin text-[12px] italic text-ash">{index}</span>
        <span className="h-px flex-1 bg-ink/15" />
      </div>
      <h2 className="mt-2.5 font-display text-[21px] leading-[1.45] text-ink">{title}</h2>
      <p className="mt-1.5 font-body text-[11px] leading-[1.85] text-ash">{note}</p>
    </div>
  );
}
