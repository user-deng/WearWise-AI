import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, Images, Plus, SlidersHorizontal, Pencil, X, Check, Loader2, ArrowDownUp } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { EditorialButton, Folio, Kicker, MarginNote, Rule } from "./editorial";
import { closet, closetInsights, profile as profileFallback, type ClosetItem } from "../lib/content";
import { ProfileCard } from "./ProfileCard";
import { CameraCapture } from "./CameraCapture";
import { HeadAvatar } from "./HeadAvatar";
import * as api from "../lib/api";

const CATEGORIES = ["全部", "上装", "下装", "连身", "鞋履", "内衣家居"] as const;
const SORTS = [
  { id: "wears", label: "穿着次数" },
  { id: "idle", label: "闲置时长" },
  { id: "name", label: "名称" },
] as const;

/** 由真实穿着/闲置数据推算一个衣橱健康度分数（0-100）。 */
function computeHealth(items: ClosetItem[]): number {
  if (!items.length) return 0;
  const active = items.filter((i) => i.idleDays < 30).length;
  const utilization = active / items.length; // 近 30 天启用率
  const worn = items.filter((i) => i.wears >= 6).length / items.length;
  return Math.round((utilization * 0.6 + worn * 0.4) * 100);
}

export function ClosetTab() {
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("全部");
  const [sort, setSort] = useState<(typeof SORTS)[number]["id"]>("idle");
  const [desc, setDesc] = useState(true); // true=倒序(默认从多到少), false=正序
  const [filterOpen, setFilterOpen] = useState(false);
  const [onlyIdle, setOnlyIdle] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<api.ApiClosetItem | null>(null);
  const [items, setItems] = useState<api.ApiClosetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // 录入相关
  const [intaking, setIntaking] = useState(false);
  const [intakeErr, setIntakeErr] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 有生成的全身形象图时用它裁头当头像；否则回退方形示例头像
  const [fullBodyUrl, setFullBodyUrl] = useState<string>("");

  // AI 建议 + 健康标题（后端每天 0 点用 Claude 生成，这里读缓存）
  const [insights, setInsights] = useState<api.ClosetInsights | null>(null);

  // 拉取真实衣橱
  const reload = async () => {
    setLoading(true);
    try {
      const list = await api.getCloset("全部", "idle");
      setItems(list);
      setOffline(false);
    } catch {
      // 后端不可用：兜底用假数据，保证界面仍可渲染
      setItems(closet as api.ApiClosetItem[]);
      setOffline(true);
    } finally {
      setLoading(false);
    }
  };

  const loadProfileAvatar = () => {
    api.getProfile().then((p) => setFullBodyUrl(p.fullBody || "")).catch(() => {});
  };

  useEffect(() => {
    reload();
    loadProfileAvatar();
    api.getInsights().then(setInsights).catch(() => setInsights(null));
  }, []);

  // 健康度优先用后端 Claude 给出的分数（70-100），缺失时回退本地估算
  const localHealth = useMemo(() => computeHealth(items), [items]);
  const health = insights?.stats?.health ?? localHealth;
  // 优先用后端 Claude 生成的建议卡与健康标题
  const cards = insights?.insights ?? closetInsights;
  const healthTitle =
    insights?.health_title ||
    (health >= 70 ? "衣橱健康度良好" : health >= 45 ? "衣橱有点沉睡" : "该盘活衣橱了");

  const visible = useMemo(() => {
    let list = items.filter((i) => (cat === "全部" ? true : i.category === cat));
    if (onlyIdle) list = list.filter((i) => i.idleDays >= 30);
    const by = {
      wears: (a: ClosetItem, b: ClosetItem) => b.wears - a.wears,
      idle: (a: ClosetItem, b: ClosetItem) => b.idleDays - a.idleDays,
      name: (a: ClosetItem, b: ClosetItem) => a.name.localeCompare(b.name),
    }[sort];
    const sorted = [...list].sort(by);
    // desc=true 用上面默认方向；false 则反转为正序
    return desc ? sorted : sorted.reverse();
  }, [items, cat, sort, onlyIdle, desc]);

  const idleCount = items.filter((i) => i.idleDays >= 30).length;

  // 录入：一张图片 → 后端补全+打标+入库 → 插到列表首位
  const doIntake = async (file: File | Blob) => {
    setAddOpen(false);
    setCameraOpen(false);
    setIntaking(true);
    setIntakeErr(null);
    try {
      const item = await api.intakeItem(file);
      setItems((l) => [item, ...l]);
    } catch (e: any) {
      setIntakeErr(e?.message || "录入失败，请重试");
    } finally {
      setIntaking(false);
    }
  };

  const onPickFile: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    e.target.value = ""; // 允许重复选择同一文件
    if (f) doIntake(f);
  };

  const doDelete = async (item: api.ApiClosetItem) => {
    setItems((l) => l.filter((x) => x.id !== item.id)); // 乐观更新
    setEditing(null);
    try {
      await api.deleteItem(item.sku_id || item.id);
    } catch {
      reload(); // 失败则回滚为服务端真值
    }
  };

  return (
    <div className="relative h-full overflow-hidden bg-ivory-deep">
      <div className="rx-grain pointer-events-none absolute inset-0" />
      <div className="rx-hide-scroll relative h-full overflow-y-auto">
        {/* 顶部 */}
        <div className="sticky top-0 z-20 bg-ivory-deep/95 px-6 pb-3 pt-11 backdrop-blur-sm">
          <div className="flex items-end justify-between">
            <div className="flex items-end gap-3">
              {/* 低调的用户头像 — 用生成的全身形象图裁出头部；点击浮出「我的形象」 */}
              <button
                onClick={() => setProfileOpen(true)}
                className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-ink/20 bg-white active:opacity-60"
              >
                {fullBodyUrl ? (
                  <HeadAvatar
                    src={fullBodyUrl}
                    alt={`${profileFallback.nickname}的头像`}
                    mode="head"
                    className="h-full w-full"
                  />
                ) : (
                  <ImageWithFallback
                    src={profileFallback.avatar}
                    alt={`${profileFallback.nickname}的头像`}
                    className="h-full w-full object-cover"
                  />
                )}
              </button>
              <div>
                <Kicker>角色道具库 / Wardrobe</Kicker>
                <h1 className="mt-1.5 font-display text-[27px] leading-none text-ink">我的衣橱</h1>
              </div>
            </div>
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 bg-ink px-3.5 py-2 font-body text-[10px] rx-track-sm text-ivory active:opacity-70"
            >
              <Plus className="h-3 w-3" strokeWidth={1.6} />
              录入
            </button>
          </div>
          {offline && (
            <p className="mt-2 font-body text-[9px] text-wine">
              未连接后端，展示的是示例数据。启动 aidress_api 后刷新即可看到真实衣橱。
            </p>
          )}
          <div className="mt-3 h-px w-full bg-ink/12" />
        </div>

        <div className="px-6 pb-6">
          {/* 健康度 */}
          <section className="mt-4 flex items-center gap-5">
            <HealthRing score={health} />
            <div className="flex-1">
              <p className="font-display text-[16px] leading-[1.5] text-ink">{healthTitle}</p>
              <MarginNote className="mt-1.5">
                {items.length} 件单品 · {idleCount} 件闲置超 30 天 · 近 30 天启用率{" "}
                {items.length ? Math.round((items.filter((i) => i.idleDays < 30).length / items.length) * 100) : 0}%
              </MarginNote>
              <div className="mt-3 grid grid-cols-3 gap-px bg-ink/12">
                {[
                  { k: "常穿", v: items.filter((i) => i.wears >= 20).length },
                  { k: "偶尔", v: items.filter((i) => i.wears >= 6 && i.wears < 20).length },
                  { k: "沉睡", v: items.filter((i) => i.wears < 6).length },
                ].map((s) => (
                  <div key={s.k} className="bg-ivory-deep px-2 py-2">
                    <p className="font-display text-[17px] leading-none text-ink">{s.v}</p>
                    <p className="mt-1 font-body text-[9px] rx-track-sm text-ash">{s.k}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* AI 建议 */}
          <section className="mt-7">
            <div className="flex items-center gap-3">
              <Kicker>AI 建议 / Notes</Kicker>
              <span className="h-px flex-1 bg-ink/12" />
              {!insights && (
                <Loader2 className="h-3 w-3 animate-spin text-ash" strokeWidth={1.4} />
              )}
            </div>
            <div className="mt-3 space-y-px">
              {cards.map((n) => (
                <div key={n.kind} className="border-b border-ink/10 bg-paper px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5" style={{ background: n.accent }} />
                    <span className="font-body text-[9px] uppercase rx-track text-ash">{n.kind}</span>
                  </div>
                  <p className="mt-2 font-display text-[15px] leading-[1.45] text-ink">{n.title}</p>
                  <p className="mt-1.5 font-body text-[11px] leading-[1.85] text-ink-soft">{n.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 分类 + 筛选 */}
          <section className="mt-7">
            <div className="flex items-center justify-between">
              <div className="rx-hide-scroll -mx-1 flex flex-1 gap-1 overflow-x-auto px-1">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCat(c)}
                    className={`shrink-0 border px-3 py-1.5 font-body text-[10px] rx-track-sm transition-colors ${
                      cat === c ? "border-ink bg-ink text-ivory" : "border-ink/20 text-ink/65"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setFilterOpen((o) => !o)}
                className="ml-2 shrink-0 border border-ink/20 p-1.5 text-ink/65 active:bg-ink active:text-ivory"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.4} />
              </button>
            </div>

            <AnimatePresence>
              {filterOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 border border-ink/15 bg-paper p-3">
                    <p className="font-body text-[9px] uppercase rx-track text-ash">排序</p>
                    <div className="mt-2 flex items-center gap-1">
                      {SORTS.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setSort(s.id)}
                          className={`border px-2.5 py-1 font-body text-[10px] ${
                            sort === s.id ? "border-ink bg-ink text-ivory" : "border-ink/20 text-ink/65"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                      {/* 正序 / 倒序 切换 */}
                      <button
                        onClick={() => setDesc((v) => !v)}
                        className="ml-auto flex items-center gap-1 border border-ink/20 px-2.5 py-1 font-body text-[10px] text-ink/70 active:bg-ink active:text-ivory"
                      >
                        <ArrowDownUp className="h-3 w-3" strokeWidth={1.4} />
                        {sort === "name" ? (desc ? "Z→A" : "A→Z") : desc ? "从多到少" : "从少到多"}
                      </button>
                    </div>
                    <button
                      onClick={() => setOnlyIdle((v) => !v)}
                      className="mt-3 flex items-center gap-2 font-body text-[10px] text-ink/70"
                    >
                      <span
                        className={`flex h-3.5 w-3.5 items-center justify-center border ${
                          onlyIdle ? "border-ink bg-ink" : "border-ink/35"
                        }`}
                      >
                        {onlyIdle && <Check className="h-2.5 w-2.5 text-ivory" strokeWidth={2.4} />}
                      </span>
                      只看闲置超 30 天
                      <span className="text-ink/40">
                        {onlyIdle ? `· 已筛出 ${visible.length} 件` : `· 共 ${idleCount} 件`}
                      </span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 单品网格 */}
            {loading ? (
              <div className="mt-10 flex flex-col items-center gap-2 text-ash">
                <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.4} />
                <p className="font-body text-[11px]">正在载入你的衣橱…</p>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {visible.map((it) => (
                  <motion.div layout key={it.id} className="border border-ink/12 bg-paper">
                    <div className="relative h-[128px] bg-white">
                      <ImageWithFallback
                        src={it.image}
                        alt={it.name}
                        className="h-full w-full object-contain p-2"
                      />
                      {it.idleDays >= 30 && (
                        <span className="absolute left-0 top-0 bg-wine px-1.5 py-[3px] font-body text-[8px] rx-track-sm text-ivory">
                          闲置 {it.idleDays}d
                        </span>
                      )}
                      <button
                        onClick={() => setEditing(it)}
                        className="absolute bottom-1.5 right-1.5 border border-ink/20 bg-paper p-1 text-ink/60 active:bg-ink active:text-ivory"
                      >
                        <Pencil className="h-3 w-3" strokeWidth={1.4} />
                      </button>
                    </div>
                    <div className="border-t border-ink/10 p-2.5">
                      <p className="truncate font-display text-[13px] text-ink">{it.name}</p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 border border-ink/15" style={{ background: it.swatch }} />
                        <span className="font-body text-[9px] rx-track-sm text-ash">
                          {it.category} · 穿过 {it.wears} 次
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {!loading && visible.length === 0 && (
              <p className="mt-10 text-center font-body text-[11px] text-ash">这个条件下还没有单品。</p>
            )}
          </section>

          <div className="mt-8">
            <Rule />
            <div className="mt-3">
              <Folio page="Wardrobe" label="Props Department" align="right" />
            </div>
          </div>
        </div>
      </div>

      <ProfileCard
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onProfileChange={loadProfileAvatar}
      />

      {/* 隐藏的文件选择器（相册 / 本地文件录入） */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPickFile}
      />

      {/* 录入进行中的遮罩 */}
      <AnimatePresence>
        {intaking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-ivory/85 backdrop-blur-sm"
          >
            <Loader2 className="h-6 w-6 animate-spin text-ink" strokeWidth={1.4} />
            <p className="font-display text-[15px] text-ink">正在补全白底图 · 识别标签…</p>
            <p className="font-body text-[10px] text-ash">这一步会调用 AI，通常需要十几秒</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 录入错误提示 */}
      <AnimatePresence>
        {intakeErr && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute inset-x-6 bottom-24 z-[60] border border-wine/40 bg-paper px-4 py-3"
          >
            <p className="font-body text-[11px] text-wine">{intakeErr}</p>
            <button
              onClick={() => setIntakeErr(null)}
              className="mt-1 font-body text-[10px] rx-track-sm text-ink/60"
            >
              知道了
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 相机拍照 */}
      <AnimatePresence>
        {cameraOpen && (
          <CameraCapture onClose={() => setCameraOpen(false)} onShot={doIntake} />
        )}
      </AnimatePresence>

      {/* 录入入口 */}
      <AnimatePresence>
        {addOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAddOpen(false)}
              className="absolute inset-0 z-40 bg-ink/50"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="absolute inset-x-0 bottom-0 z-40 bg-paper px-6 pb-8 pt-5"
            >
              <div className="mx-auto mb-4 h-[3px] w-9 bg-ink/20" />
              <Kicker>录入单品 / Intake</Kicker>
              <h3 className="mt-2 font-display text-[20px] text-ink">把新道具加进衣橱</h3>
              <div className="mt-5 space-y-px">
                <button
                  onClick={() => {
                    setAddOpen(false);
                    setCameraOpen(true);
                  }}
                  className="flex w-full items-center gap-3 border-b border-ink/10 py-4 text-left active:opacity-60"
                >
                  <Camera className="h-4 w-4 text-ink/70" strokeWidth={1.3} />
                  <span className="flex-1">
                    <span className="block font-display text-[15px] text-ink">拍照录入</span>
                    <span className="mt-0.5 block font-body text-[10px] text-ash">
                      调用相机拍一张，自动去背、识别品类与标签
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => {
                    setAddOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="flex w-full items-center gap-3 border-b border-ink/10 py-4 text-left active:opacity-60"
                >
                  <Images className="h-4 w-4 text-ink/70" strokeWidth={1.3} />
                  <span className="flex-1">
                    <span className="block font-display text-[15px] text-ink">相册录入</span>
                    <span className="mt-0.5 block font-body text-[10px] text-ash">从本地文件选一张图片</span>
                  </span>
                </button>
              </div>
              <div className="mt-5">
                <EditorialButton variant="outline" onClick={() => setAddOpen(false)}>
                  取消
                </EditorialButton>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 编辑 */}
      <AnimatePresence>
        {editing && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditing(null)}
              className="absolute inset-0 z-40 bg-ink/50"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="absolute inset-x-0 bottom-0 z-40 bg-paper px-6 pb-8 pt-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <Kicker>编辑单品 / Edit</Kicker>
                  <h3 className="mt-2 font-display text-[19px] text-ink">{editing.name}</h3>
                </div>
                <button onClick={() => setEditing(null)} className="text-ink/50 active:opacity-50">
                  <X className="h-4 w-4" strokeWidth={1.2} />
                </button>
              </div>
              <div className="mt-4 flex gap-4">
                <div className="h-[92px] w-[92px] border border-ink/12 bg-white">
                  <ImageWithFallback
                    src={editing.image}
                    alt={editing.name}
                    className="h-full w-full object-contain p-1.5"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  {[
                    { k: "品类", v: `${editing.category}${editing.sub ? " · " + editing.sub : ""}` },
                    { k: "颜色", v: editing.color },
                    { k: "穿着次数", v: `${editing.wears} 次` },
                    { k: "闲置", v: `${editing.idleDays} 天` },
                  ].map((r) => (
                    <div key={r.k} className="flex items-baseline justify-between border-b border-ink/10 pb-1.5">
                      <span className="font-body text-[9px] rx-track-sm text-ash">{r.k}</span>
                      <span className="font-display text-[13px] text-ink">{r.v}</span>
                    </div>
                  ))}
                </div>
              </div>
              {editing.description && (
                <p className="mt-3 font-body text-[11px] leading-[1.85] text-ink-soft">
                  {editing.description}
                </p>
              )}
              <div className="mt-5 grid grid-cols-2 gap-2">
                <EditorialButton variant="outline" onClick={() => doDelete(editing)}>
                  移到观察区
                </EditorialButton>
                <EditorialButton onClick={() => setEditing(null)}>完成</EditorialButton>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── 健康度圆环 ── */
function HealthRing({ score }: { score: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-[92px] w-[92px] shrink-0">
      <svg viewBox="0 0 92 92" className="h-full w-full -rotate-90">
        <circle cx="46" cy="46" r={r} fill="none" stroke="rgba(20,17,15,0.12)" strokeWidth="2" />
        <motion.circle
          cx="46"
          cy="46"
          r={r}
          fill="none"
          stroke="var(--rx-sage-deep)"
          strokeWidth="2"
          strokeLinecap="butt"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[26px] leading-none text-ink">{score}</span>
        <span className="mt-1 font-body text-[8px] rx-track-sm text-ash">健康度</span>
      </div>
    </div>
  );
}
