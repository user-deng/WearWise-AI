import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bookmark, Volume2, VolumeX, Play, RotateCcw, Check } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Kicker, Tag } from "./editorial";
import { posters, type Poster } from "../lib/content";
import { useStore, type EmotionLook } from "../lib/store";
import * as api from "../lib/api";

const SLIDE_W = 320;
const SLIDE_H = 664;
const GAP = 12;

const TONE_CYCLE: Poster["tone"][] = ["ink", "sage", "blush", "wine"];

/** 把送花推荐的一套穿搭映射成 Poster —— 复用同一套海报模板与特效。 */
function lookToPoster(look: EmotionLook, i: number): Poster {
  return {
    id: `look-${look.index}`,
    headline: `明天，${look.title}`,   // jsonl 标题
    scene: look.query,                 // 风格名（如 昭和复古风）
    narration: look.desc || look.reason, // jsonl 说明
    tags: look.tags,                   // jsonl 关键词
    image: look.front,                 // 正面：大片图
    lookImage: look.front,
    layoutImage: look.back,            // 背面：对应排版图
    styleName: look.query,
    song: { title: look.look_name || look.query, artist: "为你推荐", source: "今日心情" },
    tone: TONE_CYCLE[i % TONE_CYCLE.length],
    episode: `EP.${String(i + 1).padStart(3, "0")}`,
    outfit: [],
  };
}

export function PrescriptionTab() {
  const { emotionLooks } = useStore();
  // 选花推荐来了：把它映射成 poster，喂进同一套海报模板（替换内容，不新建页面）
  const looksPosters = emotionLooks.map(lookToPoster);
  return <PosterFeed posters={looksPosters.length ? looksPosters : posters} isLooks={looksPosters.length > 0} />;
}

function PosterFeed({ posters: feed, isLooks }: { posters: Poster[]; isLooks: boolean }) {
  const { focusPoster, soundOn, enableSound, toggleSound, favorites, toggleFavorite, saveOutfit } = useStore();
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState<string | null>(null);
  const [narrationFor, setNarrationFor] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  // 已确认「设为明日穿搭」的卡片 id 集合
  const [chosen, setChosen] = useState<string[]>([]);

  // 背景音乐：从 音乐/ 目录循环播放
  const [tracks, setTracks] = useState<api.MusicTrack[]>([]);
  const [trackIdx, setTrackIdx] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    api
      .getMusic()
      .then((list) => {
        setTracks(list);
        // 随机选一首开始
        if (list.length) setTrackIdx(Math.floor(Math.random() * list.length));
      })
      .catch(() => setTracks([]));
  }, []);

  // 随机切到下一首（尽量不与当前重复）
  const nextRandom = () => {
    setTrackIdx((cur) => {
      if (tracks.length <= 1) return cur;
      let n = cur;
      while (n === cur) n = Math.floor(Math.random() * tracks.length);
      return n;
    });
  };

  // soundOn / 曲目变化时控制播放
  useEffect(() => {
    const el = audioRef.current;
    if (!el || tracks.length === 0) return;
    if (soundOn) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [soundOn, trackIdx, tracks]);

  const nowPlaying = tracks[trackIdx];

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / (SLIDE_W + GAP));
    if (i !== index) {
      setIndex(i);
      setNarrationFor(null);
      setFlipped(null);
      if (feed[i]) focusPoster(feed[i].id);
    }
  };


  return (
    <div className="rx-grain relative h-full overflow-hidden bg-ink">
      {/* 顶部栏 */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-start justify-between px-5 pt-11">
        <div>
          <Kicker tone="ivory">
            {isLooks ? "今日心情 · 为你选的穿搭" : "穿搭灵感 / Inspo"}
          </Kicker>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => (soundOn ? toggleSound() : enableSound())}
            className="text-ivory/75 active:opacity-50"
          >
            {soundOn ? (
              <Volume2 className="h-4 w-4" strokeWidth={1.3} />
            ) : (
              <VolumeX className="h-4 w-4" strokeWidth={1.3} />
            )}
          </button>
        </div>
      </div>

      {/* 横向海报流 */}
      <div
        ref={scroller}
        onScroll={onScroll}
        className="rx-hide-scroll flex h-full snap-x snap-mandatory items-center overflow-x-auto"
        style={{ paddingLeft: (390 - SLIDE_W) / 2, paddingRight: (390 - SLIDE_W) / 2 }}
      >
        {feed.map((p, i) => (
          <PosterCard
            key={p.id}
            poster={p}
            active={i === index}
            flipped={flipped === p.id}
            favored={favorites.includes(p.id)}
            soundOn={soundOn}
            narrating={narrationFor === p.id}
            onNarrate={(on) => setNarrationFor(on ? p.id : null)}
            onFavorite={() => toggleFavorite(p.id)}
            chosen={chosen.includes(p.id)}
            onChoose={() => {
              setChosen((c) => (c.includes(p.id) ? c : [...c, p.id]));
              saveOutfit({
                posterId: p.id,
                picks: Object.fromEntries(p.outfit.map((s) => [s.slot, s.options[0].id])),
              });
            }}
            onFlip={() => {
              if (!soundOn) enableSound();
              setFlipped(p.id);
            }}
            onFlipBack={() => setFlipped(null)}
          />
        ))}
      </div>

      {/* 背景音乐：循环播放 音乐/ 目录，播完一首自动下一首 */}
      {nowPlaying && (
        <audio ref={audioRef} src={nowPlaying.url} onEnded={nextRandom} />
      )}

      {/* 音乐条 */}
      <div className="absolute inset-x-0 bottom-0 z-30 flex items-center gap-3 bg-gradient-to-t from-ink to-transparent px-6 pb-5 pt-8">
        <div className="flex flex-1 items-center gap-3">
          {soundOn ? (
            <span className="flex h-4 items-end gap-[2px]">
              {[0, 1, 2, 3].map((b) => (
                <motion.span
                  key={b}
                  className="w-[2px] bg-blush"
                  animate={{ height: [4, 14, 7, 12, 5] }}
                  transition={{ duration: 1.1, repeat: Infinity, delay: b * 0.13 }}
                />
              ))}
            </span>
          ) : (
            <Play className="h-3.5 w-3.5 text-ivory/60" strokeWidth={1.4} />
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-[13px] text-ivory">
              {nowPlaying ? nowPlaying.title : "暂无音乐"}
            </span>
            <span className="block truncate font-body text-[9px] rx-track-sm text-ivory/45">
              {soundOn ? "正在播放" : "点击开启声音"}
            </span>
          </span>
        </div>
        {!soundOn && (
          <button
            onClick={enableSound}
            className="border border-ivory/40 px-3 py-1.5 font-body text-[9px] rx-track-sm text-ivory active:opacity-60"
          >
            开启声音
          </button>
        )}
      </div>

      <RoleLibrary open={showLibrary} onClose={() => setShowLibrary(false)} />
    </div>
  );
}

/* ─────────────── 可翻面的海报卡片 ─────────────── */

function PosterCard({
  poster,
  active,
  flipped,
  favored,
  soundOn,
  narrating,
  chosen,
  onChoose,
  onNarrate,
  onFavorite,
  onFlip,
  onFlipBack,
}: {
  poster: Poster;
  active: boolean;
  flipped: boolean;
  favored: boolean;
  soundOn: boolean;
  narrating: boolean;
  chosen: boolean;
  onChoose: () => void;
  onNarrate: (on: boolean) => void;
  onFavorite: () => void;
  onFlip: () => void;
  onFlipBack: () => void;
}) {
  return (
    <motion.div
      className="shrink-0 snap-center"
      style={{ width: SLIDE_W, marginRight: GAP, height: SLIDE_H, perspective: 1600 }}
      animate={{ scale: active ? 1 : 0.9, opacity: active ? 1 : 0.5 }}
      transition={{ type: "spring", stiffness: 220, damping: 28 }}
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* ── 正面：动态场景海报 ── */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
        >
          <PosterFront
            poster={poster}
            active={active && !flipped}
            favored={favored}
            soundOn={soundOn}
            narrating={narrating}
            onNarrate={(on) => !flipped && onNarrate(on)}
            onFavorite={onFavorite}
            onFlip={onFlip}
          />
        </div>

        {/* ── 背面：白底造型分解档案 ── */}
        <div
          className="absolute inset-0 overflow-hidden bg-white"
          style={{
            transform: "rotateY(180deg)",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          <PosterBack
            poster={poster}
            onFlipBack={onFlipBack}
            visible={flipped}
            chosen={chosen}
            onChoose={onChoose}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── 正面 ── */
/** 正面主视觉视频：居中(active)时播放，滑走时暂停省资源；静音循环、自适应铺满。 */
function PosterVideo({ src, active, poster }: { src: string; active: boolean; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (active) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [active]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
      className="h-full w-full object-cover"
    />
  );
}

function PosterFront({
  poster,
  active,
  favored,
  soundOn,
  narrating,
  onNarrate,
  onFavorite,
  onFlip,
}: {
  poster: Poster;
  active: boolean;
  favored: boolean;
  soundOn: boolean;
  narrating: boolean;
  onNarrate: (on: boolean) => void;
  onFavorite: () => void;
  onFlip: () => void;
}) {
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = () => {
    press.current = setTimeout(() => onNarrate(true), 380);
  };
  const end = () => {
    if (press.current) clearTimeout(press.current);
    onNarrate(false);
  };

  const accent =
    poster.tone === "sage"
      ? "text-sage"
      : poster.tone === "blush"
        ? "text-blush"
        : poster.tone === "wine"
          ? "text-blush-deep"
          : "text-ivory";

  return (
    <article
      className="relative h-full w-full"
      onPointerDown={start}
      onPointerUp={end}
      onPointerLeave={end}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 主视觉 — 有视频则播放视频，否则静态大图（仅居中时循环 3 秒缓动） */}
      {poster.video ? (
        <div className="absolute inset-0">
          <PosterVideo src={poster.video} active={active} poster={poster.image} />
        </div>
      ) : (
        <motion.div
          className="absolute inset-0"
          animate={active ? { scale: [1, 1.075, 1], x: [0, -7, 0] } : { scale: 1, x: 0 }}
          transition={active ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : { duration: 0.4 }}
        >
          <ImageWithFallback src={poster.image} alt={poster.scene} className="h-full w-full object-cover" />
        </motion.div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-ink/45" />
      <div className="rx-grain absolute inset-0" />

      <div className="relative flex h-full flex-col justify-between p-5 pt-16">
        <div className="flex items-start justify-between">
          <p className="font-latin text-[12px] italic text-ivory/65">{poster.episode}</p>
          <button onClick={onFavorite} className="p-1 active:opacity-50">
            <Bookmark
              className={`h-5 w-5 ${favored ? "fill-blush text-blush" : "text-ivory/75"}`}
              strokeWidth={1.2}
            />
          </button>
        </div>

        <div>
          <h2 className={`font-display text-[31px] leading-[1.26] ${accent}`}>{poster.headline}</h2>
          <p className="mt-3 font-body text-[11px] leading-[1.85] text-ivory/60">场景 · {poster.scene}</p>
          <p className="mt-2 font-display text-[13px] leading-[1.75] text-ivory/80">「{poster.narration}」</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {poster.tags.map((t) => (
              <Tag key={t} tone="ivory">
                {t}
              </Tag>
            ))}
          </div>
          <div className="mt-5 h-px w-full bg-ivory/25" />
          <button
            onClick={onFlip}
            className="mt-4 w-full bg-ivory px-4 py-3 font-body text-[11px] rx-track-sm text-ink active:opacity-70"
          >
            明天选中这套吧！
          </button>
          <p className="mt-2.5 text-center font-body text-[9px] rx-track-sm text-ivory/40">
            长按海报听角色旁白
          </p>
        </div>
      </div>

      {/* 长按旁白 */}
      <AnimatePresence>
        {narrating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            className="absolute inset-0 flex flex-col justify-center bg-ink/88 px-7"
          >
            <Kicker tone="ivory">Narration / 角色旁白</Kicker>
            <motion.p
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.08, duration: 0.5 }}
              className="mt-4 font-display text-[23px] leading-[1.6] text-ivory"
            >
              「{poster.narration}」
            </motion.p>
            <p className="mt-6 font-latin text-[12px] italic text-ivory/50">
              {soundOn ? `Now playing — ${poster.song.title}` : "松开手指返回海报"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

/* ── 背面：白底造型档案 ── */
function PosterBack({
  poster,
  onFlipBack,
  visible,
  chosen,
  onChoose,
}: {
  poster: Poster;
  onFlipBack: () => void;
  visible: boolean;
  chosen?: boolean;
  onChoose?: () => void;
}) {
  // 送花推荐：背面直接展示对应的「排版图」（正面大片 → 背面排版），图片占满两侧
  if (poster.layoutImage) {
    return (
      <div className="relative flex h-full flex-col bg-white text-ink">
        {/* 排版图（全幅展示，占满左右空间） */}
        <div className="relative min-h-0 flex-1 bg-white">
          <motion.div
            initial={{ opacity: 0 }}
            animate={visible ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="absolute inset-0"
          >
            <ImageWithFallback
              src={poster.layoutImage}
              alt="穿搭单品排版图"
              className="h-full w-full object-contain"
            />
          </motion.div>
        </div>

        {/* 操作区：先出「设为明日穿搭」按钮，点了才确认 */}
        <div className="shrink-0 border-t border-ink/25 px-4 pb-4 pt-3">
          {chosen ? (
            <>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-body text-[10px] rx-track-sm text-sage-deep">
                  <Check className="h-3.5 w-3.5" strokeWidth={1.6} />
                  已选为明日穿搭
                </span>
                <button
                  onClick={onFlipBack}
                  className="flex items-center gap-1.5 border border-ink/25 px-2.5 py-1.5 font-body text-[9px] rx-track-sm text-ink active:bg-ink active:text-white"
                >
                  <RotateCcw className="h-3 w-3" strokeWidth={1.4} />
                  翻回大片
                </button>
              </div>
              <p className="mt-2 font-body text-[9px] leading-relaxed text-ink/45">
                明早 9 点会提醒你穿上这套。
              </p>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onChoose}
                className="flex flex-1 items-center justify-center gap-1.5 bg-ink px-4 py-3 font-body text-[11px] rx-track-sm text-white active:opacity-75"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={1.8} />
                设为明日穿搭
              </button>
              <button
                onClick={onFlipBack}
                className="flex items-center gap-1.5 border border-ink/25 px-2.5 py-3 font-body text-[9px] rx-track-sm text-ink active:bg-ink active:text-white"
              >
                <RotateCcw className="h-3 w-3" strokeWidth={1.4} />
                翻回
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 每个 slot 取第一个选项作为本套造型的单品
  const items = poster.outfit.map((s) => ({ slot: s.slot, ...s.options[0] }));

  return (
    <div className="relative flex h-full flex-col bg-white text-ink">
      {/* 档案头 */}
      <div className="shrink-0 border-b border-ink/25 px-4 pb-2.5 pt-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-body text-[8px] uppercase rx-track text-ink/55">Look Sheet / 造型档案</p>
            <p className="mt-1.5 max-w-[190px] font-display text-[14px] leading-[1.5] text-ink">
              {poster.headline}
            </p>
          </div>
          <div className="text-right">
            <p className="font-latin text-[12px] italic text-ink/70">{poster.episode}</p>
            <p className="mt-0.5 font-body text-[8px] rx-track-sm text-ink/45">
              {items.length} ITEMS
            </p>
          </div>
        </div>
      </div>

      {/* 左：单品白底平铺；右：全身效果 */}
      <div className="flex min-h-0 flex-1">
        <div className="rx-hide-scroll w-[47%] shrink-0 overflow-y-auto border-r border-ink/20">
          {items.map((it, i) => (
            <motion.div
              key={it.id}
              initial={{ opacity: 0, x: -10 }}
              animate={visible ? { opacity: 1, x: 0 } : { opacity: 0 }}
              transition={{ delay: 0.5 + i * 0.09, duration: 0.4 }}
              className="flex items-center gap-2 border-b border-ink/12 px-2.5 py-2"
            >
              <span className="w-[16px] shrink-0 font-latin text-[11px] italic text-ink/55">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="h-[52px] w-[52px] shrink-0 border border-ink/15">
                <ImageWithFallback
                  src={it.image}
                  alt={it.name}
                  className="h-full w-full object-contain p-1"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-body text-[7px] uppercase rx-track text-ink/45">{it.slot}</p>
                <p className="truncate font-display text-[11px] leading-tight text-ink">{it.name}</p>
                <p
                  className={`mt-1 inline-block border px-1 py-[1px] font-body text-[7px] rx-track-sm ${
                    it.owned ? "border-sage-deep text-sage-deep" : "border-wine text-wine"
                  }`}
                >
                  {it.owned ? "衣橱已有" : "建议替换"}
                </p>
              </div>
            </motion.div>
          ))}
          <div className="px-2.5 py-2">
            <p className="font-latin text-[10px] italic leading-[1.6] text-ink/45">
              Flat lay — 白底分解图，按模块编号。
            </p>
          </div>
        </div>

        <div className="relative flex-1">
          <motion.div
            initial={{ opacity: 0 }}
            animate={visible ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="absolute inset-0"
          >
            <ImageWithFallback
              src={poster.lookImage}
              alt="穿上完整造型后的全身效果"
              className="h-full w-full object-cover"
            />
          </motion.div>
          <span className="absolute left-0 top-0 border-b border-r border-ink/25 bg-white px-1.5 py-1 font-body text-[7px] rx-track-sm text-ink">
            FULL LOOK
          </span>
          {/* 细线标注 */}
          <span className="absolute bottom-[86px] left-0 h-px w-5 bg-ink/50" />
          <span className="absolute bottom-[80px] left-6 bg-white/85 px-1 font-latin text-[9px] italic text-ink">
            silhouette
          </span>
        </div>
      </div>

      {/* 确认状态 */}
      <div className="shrink-0 border-t border-ink/25 px-4 pb-4 pt-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={visible ? { opacity: 1, y: 0 } : { opacity: 0 }}
          transition={{ delay: 0.85, duration: 0.45 }}
          className="flex items-center justify-between"
        >
          <span className="flex items-center gap-1.5 font-body text-[10px] rx-track-sm text-sage-deep">
            <Check className="h-3.5 w-3.5" strokeWidth={1.6} />
            已选为明日穿搭
          </span>
          <button
            onClick={onFlipBack}
            className="flex items-center gap-1.5 border border-ink/25 px-2.5 py-1.5 font-body text-[9px] rx-track-sm text-ink active:bg-ink active:text-white"
          >
            <RotateCcw className="h-3 w-3" strokeWidth={1.4} />
            翻回海报
          </button>
        </motion.div>
        <p className="mt-2 font-body text-[9px] leading-relaxed text-ink/45">
          明早 9 点会提醒你穿上这个角色。
        </p>
      </div>
    </div>
  );
}

/* ─────────────── 我的角色库 ─────────────── */
function RoleLibrary({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { favorites, savedOutfits } = useStore();
  const collected = posters.filter((p) => favorites.includes(p.id));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 bg-ivory"
        >
          <div className="rx-grain absolute inset-0" />
          <div className="relative flex h-full flex-col px-6 pb-8 pt-12">
            <div className="flex items-start justify-between">
              <div>
                <Kicker>我的角色库 / Archive</Kicker>
                <h2 className="mt-2 font-display text-[28px] leading-tight text-ink">收藏的角色</h2>
              </div>
              <button onClick={onClose} className="font-body text-[10px] rx-track-sm text-ink/60 active:opacity-50">
                关闭
              </button>
            </div>

            <p className="mt-3 font-latin text-[12px] italic text-ash">
              {collected.length} roles collected · {savedOutfits.length} outfits saved
            </p>

            <div className="rx-hide-scroll mt-5 flex-1 overflow-y-auto">
              {collected.length === 0 ? (
                <p className="mt-16 text-center font-body text-[12px] leading-relaxed text-ash">
                  还没有收藏的角色。
                  <br />
                  在海报右上角点书签，把她留下来。
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {collected.map((p) => (
                    <div key={p.id} className="border border-ink/12 bg-paper">
                      <div className="relative h-[150px] overflow-hidden">
                        <ImageWithFallback src={p.image} alt={p.scene} className="h-full w-full object-cover" />
                        <span className="absolute left-0 top-0 bg-ink px-1.5 py-[3px] font-body text-[8px] rx-track-sm text-ivory">
                          {p.episode}
                        </span>
                      </div>
                      <div className="p-2.5">
                        <p className="font-display text-[13px] leading-[1.45] text-ink">{p.headline}</p>
                        <p className="mt-1 font-body text-[9px] rx-track-sm text-ash">{p.tags[0]}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
