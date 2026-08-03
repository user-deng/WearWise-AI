import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Loader2, Sparkles } from "lucide-react";
import { EditorialButton, Kicker, Rule } from "./editorial";
import {
  bouquets,
  flowerGame,
  photos,
  weatherMoods,
  type Bouquet,
  type WeatherKey,
} from "../lib/content";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useStore } from "../lib/store";
import * as api from "../lib/api";

type Stage = "flower" | "word" | "looks";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * 送自己一束花 —— 选一束花 → 花语解释 → 据情绪推荐穿搭。
 */
export function AuditionFlow() {
  const { auditionOpen, closeAudition, setTab, setEmotionLooks } = useStore();
  const [stage, setStage] = useState<Stage>("flower");
  const [bouquet, setBouquet] = useState<Bouquet | null>(null);

  // 情绪推荐
  const [recErr, setRecErr] = useState<string | null>(null);

  // 每次打开都从「选花」开始
  useEffect(() => {
    if (auditionOpen) {
      setStage("flower");
      setBouquet(null);
      setRecErr(null);
    }
  }, [auditionOpen]);

  if (!auditionOpen) return null;

  const chooseBouquet = (b: Bouquet) => {
    if (bouquet) return;
    setBouquet(b);
    setTimeout(() => setStage("word"), 560);
  };

  const again = () => {
    setBouquet(null);
    setRecErr(null);
    setStage("flower");
  };

  // 收下花 → 读心情 → 据情绪让 Claude 推荐 5 套穿搭 → 跳到处方 tab 展示
  const seeLooks = async () => {
    if (!bouquet) return;
    setStage("looks");
    setRecErr(null);
    try {
      const r = await api.recommendByEmotion(bouquet.emotions, [bouquet.flower]);
      // 把推荐结果交给处方 tab，关闭弹层并跳转
      setEmotionLooks(r.mood, r.recommendations as any);
      setTab("rx");
      closeAudition();
    } catch (e: any) {
      setRecErr(e?.message || "推荐失败，请重试");
    }
  };

  return (
    <div className="rx-grain absolute inset-0 z-50 overflow-hidden bg-ivory">
      {/* 安静的纸张 / 织物底纹 */}
      <ImageWithFallback
        src={photos.fabricParchment}
        alt="纸张纹理"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.35]"
      />
      <div className="pointer-events-none absolute inset-0 bg-ivory/55" />

      <button
        onClick={closeAudition}
        className="absolute right-5 top-12 z-20 text-ink/50 active:opacity-50"
      >
        <X className="h-4 w-4" strokeWidth={1.2} />
      </button>

      <div className="relative flex h-full flex-col px-6 pb-12 pt-12">
        <div>
          <Kicker>A Bouquet for You / 送自己一束花</Kicker>
          <p className="mt-2 font-latin text-[12px] italic text-ash">
            {stage === "flower"
              ? "No. 01 — Choose"
              : stage === "word"
              ? "No. 02 — A Note"
              : "No. 03 — For You"}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* ── 第一步：选花 ── */}
          {stage === "flower" && (
            <motion.div
              key="flower"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="mt-7 flex min-h-0 flex-1 flex-col"
            >
              <h2 className="font-display text-[23px] leading-[1.5] text-ink">{flowerGame.stepOne.title}</h2>
              <p className="mt-2.5 font-body text-[11px] leading-[1.9] text-ash">{flowerGame.stepOne.note}</p>

              <div className="rx-hide-scroll mt-6 grid grid-cols-3 gap-x-3 gap-y-5 overflow-y-auto pb-4">
                {bouquets.map((b) => {
                  const chosen = bouquet?.id === b.id;
                  const dim = !!bouquet && !chosen;
                  return (
                    <motion.button
                      key={b.id}
                      onClick={() => chooseBouquet(b)}
                      animate={{ scale: chosen ? 1.06 : 1, opacity: dim ? 0.28 : 1 }}
                      transition={{ duration: 0.5, ease: EASE }}
                      className="block text-left"
                    >
                      <div className="relative flex h-[112px] w-full items-center justify-center overflow-hidden bg-paper/70 p-2">
                        <ImageWithFallback
                          src={b.photo}
                          alt={b.flower}
                          className="h-full w-full object-contain"
                        />
                        {chosen && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 border border-ink/45"
                          />
                        )}
                      </div>
                      <span className="mt-1.5 block truncate font-body text-[10px] text-ash">{b.flower}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── 第二步：花名 + 花语 + 解释 ── */}
          {stage === "word" && bouquet && (
            <motion.div
              key="word"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="mt-6 flex flex-1 flex-col"
            >
              <div className="flex justify-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, ease: EASE }}
                  className="relative h-[200px] w-[200px] overflow-hidden"
                >
                  {/* 依据花种生长环境的天气氛围 */}
                  <WeatherScene weather={bouquet.weather} />
                  <div className="absolute inset-0 flex items-center justify-center p-5">
                    <ImageWithFallback
                      src={bouquet.photo}
                      alt={bouquet.flower}
                      className="h-full w-full object-contain drop-shadow-[0_10px_18px_rgba(20,17,15,0.22)]"
                    />
                  </div>
                  <div className="absolute left-3 top-3 flex flex-col">
                    <span className="font-latin text-[10px] italic text-ink/55">
                      {weatherMoods[bouquet.weather].latin}
                    </span>
                    <span className="font-display text-[12px] leading-tight text-ink/80">
                      {weatherMoods[bouquet.weather].label}
                    </span>
                  </div>
                </motion.div>
              </div>

              {/* 花名 */}
              <p className="mt-4 text-center font-body text-[10px] rx-track-sm text-ash">
                你选的是 · {bouquet.flower}
              </p>

              {/* 花语 */}
              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16, duration: 0.6, ease: EASE }}
                className="mt-2 text-center font-display text-[23px] leading-[1.55] text-ink"
              >
                {bouquet.word}
              </motion.h2>

              {/* 花语解释 */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.28, duration: 0.6 }}
                className="mt-3 text-center font-body text-[11px] leading-[1.95] text-ink-soft"
              >
                {bouquet.meaning}
              </motion.p>

              <div className="mt-auto space-y-3">
                <Rule />
                <EditorialButton onClick={seeLooks}>看看今天适合我的穿搭 →</EditorialButton>
                <button
                  onClick={again}
                  className="w-full py-1 font-body text-[10.5px] rx-track-sm text-ash active:opacity-50"
                >
                  {flowerGame.result.secondary}
                </button>
                <p className="pt-1 text-center font-body text-[9px] leading-[1.7] text-ash/60">
                  {flowerGame.disclaimer}
                </p>
              </div>
            </motion.div>
          )}

          {/* ── 第三步：读心情（加载态）→ 完成后跳转处方 tab ── */}
          {stage === "looks" && bouquet && (
            <motion.div
              key="looks"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.55, ease: EASE }}
              className="mt-6 flex min-h-0 flex-1 flex-col"
            >
              {recErr ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3">
                  <p className="font-body text-[12px] text-wine">{recErr}</p>
                  <EditorialButton variant="outline" onClick={seeLooks}>
                    重试
                  </EditorialButton>
                  <button
                    onClick={again}
                    className="py-1 font-body text-[10.5px] rx-track-sm text-ash active:opacity-50"
                  >
                    再选一束花
                  </button>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 text-ash">
                  {/* 花在中央轻轻呼吸 */}
                  <motion.div
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                    className="h-[120px] w-[120px]"
                  >
                    <ImageWithFallback
                      src={bouquet.photo}
                      alt={bouquet.flower}
                      className="h-full w-full object-contain drop-shadow-[0_10px_18px_rgba(20,17,15,0.18)]"
                    />
                  </motion.div>
                  <div className="flex items-center gap-2 text-ink">
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                    <p className="font-display text-[16px]">正在读你此刻的心情…</p>
                  </div>
                  <p className="font-body text-[10.5px] leading-[1.8]">
                    据这束「{bouquet.flower}」为你挑选穿搭
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ───────── 适生天气氛围场景（纯 CSS / motion，跟随花种生长环境） ───────── */

const SKY: Record<WeatherKey, string> = {
  sun: "linear-gradient(180deg, #f6e6bf 0%, #f2d9a3 55%, #eccf95 100%)",
  spring: "linear-gradient(180deg, #eaf1e2 0%, #f3efe2 50%, #f7f2e6 100%)",
  rain: "linear-gradient(180deg, #cdd6da 0%, #bcc7cd 55%, #aeb9c0 100%)",
  mist: "linear-gradient(180deg, #e4e8e6 0%, #d9dedb 55%, #cdd4d1 100%)",
  breeze: "linear-gradient(180deg, #dfeaf0 0%, #eaf0ec 55%, #f2f1e6 100%)",
  desert: "linear-gradient(180deg, #f3ddb8 0%, #e9c99a 55%, #dcb583 100%)",
  tropical: "linear-gradient(180deg, #d8e9d6 0%, #ecd9b0 60%, #f0cf9e 100%)",
  dusk: "linear-gradient(180deg, #d9b79f 0%, #c69a8b 52%, #9c6d6a 100%)",
};

function WeatherScene({ weather }: { weather: WeatherKey }) {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: SKY[weather] }}
    >
      {/* 地平线 / 地面 */}
      {weather === "desert" ? (
        <>
          <div
            className="absolute inset-x-0 bottom-0 h-[42%]"
            style={{
              background:
                "radial-gradient(140% 90% at 30% 0%, #e7c187 0%, #d9ac6e 60%, #c8985a 100%)",
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-[26%]"
            style={{
              background: "radial-gradient(120% 120% at 78% 0%, #cf9d5f, transparent 70%)",
            }}
          />
        </>
      ) : (
        <div className="absolute inset-x-0 bottom-0 h-[30%] bg-black/[0.06]" />
      )}

      {/* 太阳 —— 烈日 */}
      {weather === "sun" && (
        <>
          <motion.div
            className="absolute right-5 top-4 h-[46px] w-[46px] rounded-full bg-[#f7b955]"
            animate={{ opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            style={{ boxShadow: "0 0 26px 8px rgba(247,185,85,0.55)" }}
          />
          <motion.div
            className="absolute right-[10px] top-[10px] h-[62px] w-[62px] rounded-full border border-[#f7b955]/40"
            animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}

      {/* 沙漠 —— 白热的太阳 + 热浪 */}
      {weather === "desert" && (
        <motion.div
          className="absolute right-6 top-5 h-[38px] w-[38px] rounded-full bg-[#fff2d6]"
          animate={{ opacity: [0.9, 1, 0.9] }}
          transition={{ duration: 4, repeat: Infinity }}
          style={{ boxShadow: "0 0 30px 10px rgba(255,242,214,0.7)" }}
        />
      )}

      {/* 春 / 微风 —— 柔和的日晕 */}
      {(weather === "spring" || weather === "breeze") && (
        <div
          className="absolute left-1/2 top-2 h-[70px] w-[70px] -translate-x-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,250,235,0.9) 0%, transparent 70%)",
          }}
        />
      )}

      {/* 雨丝 */}
      {weather === "rain" &&
        Array.from({ length: 16 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute top-[-12%] w-px bg-[#5f7078]/45"
            style={{ left: `${6 + i * 6}%`, height: 16 + (i % 3) * 6 }}
            animate={{ y: ["-10%", "130%"] }}
            transition={{
              duration: 0.9 + (i % 4) * 0.18,
              repeat: Infinity,
              ease: "linear",
              delay: (i % 6) * 0.14,
            }}
          />
        ))}
      {weather === "rain" && (
        <div className="absolute left-6 top-4 h-[30px] w-[52px] rounded-full bg-white/45 blur-[2px]" />
      )}

      {/* 薄雾 */}
      {weather === "mist" &&
        Array.from({ length: 3 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-[26px] w-[150%] bg-white/45 blur-[6px]"
            style={{ top: `${34 + i * 20}%`, left: "-25%" }}
            animate={{ x: ["-8%", "8%", "-8%"] }}
            transition={{ duration: 7 + i * 2, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

      {/* 微风 —— 飘动的花瓣/叶 */}
      {(weather === "breeze" || weather === "tropical") &&
        Array.from({ length: 7 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-[6px] w-[6px] rounded-full"
            style={{
              top: `${14 + i * 10}%`,
              left: "-6%",
              background: weather === "tropical" ? "#e58a5a" : "#c9b6a0",
              opacity: 0.7,
            }}
            animate={{ x: ["-6%", "112%"], y: [0, 10, -6, 8, 0] }}
            transition={{
              duration: 5 + (i % 3),
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.5,
            }}
          />
        ))}

      {/* 热带 —— 湿热日光 */}
      {weather === "tropical" && (
        <motion.div
          className="absolute right-5 top-4 h-[42px] w-[42px] rounded-full bg-[#f6c66b]"
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 3.4, repeat: Infinity }}
          style={{ boxShadow: "0 0 24px 8px rgba(246,198,107,0.5)" }}
        />
      )}

      {/* 暮色 —— 落日 */}
      {weather === "dusk" && (
        <>
          <motion.div
            className="absolute left-1/2 top-8 h-[54px] w-[54px] -translate-x-1/2 rounded-full bg-[#e58c6a]"
            animate={{ opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 4, repeat: Infinity }}
            style={{ boxShadow: "0 0 34px 12px rgba(229,140,106,0.45)" }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-[38%]"
            style={{ background: "linear-gradient(180deg, transparent, rgba(90,50,55,0.35))" }}
          />
        </>
      )}

      {/* 统一柔光叠层 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(110% 70% at 50% 12%, rgba(255,255,255,0.28), transparent 60%)",
        }}
      />
    </div>
  );
}
