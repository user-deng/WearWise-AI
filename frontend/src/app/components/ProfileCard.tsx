import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Pencil, Check, Loader2, Upload, Camera, Sparkles, Trash2 } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Kicker } from "./editorial";
import { profile as profileFallback } from "../lib/content";
import { CameraCapture } from "./CameraCapture";
import * as api from "../lib/api";

type Fields = {
  nickname: string;
  height: string;
  weight: string;
  bodyNotes: string;
  gender: string;
  age: string;
  occupation: string;
};

/** 「我的形象」— 白底杂志人物档案浮窗（接真实档案 + AI 形象生成） */
export function ProfileCard({
  open,
  onClose,
  onProfileChange,
}: {
  open: boolean;
  onClose: () => void;
  /** 档案/形象图更新后通知父组件（如刷新顶部头像） */
  onProfileChange?: () => void;
}) {
  const [fields, setFields] = useState<Fields>({
    nickname: profileFallback.nickname,
    height: profileFallback.height,
    weight: profileFallback.weight,
    bodyNotes: profileFallback.bodyNotes,
    gender: "女",
    age: "",
    occupation: "",
  });
  const [fullBody, setFullBody] = useState<string>(profileFallback.fullBody);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // 生成形象图（参考图可来自 上传 或 拍照）
  const [genOpen, setGenOpen] = useState(false);
  const [refFiles, setRefFiles] = useState<File[]>([]);
  const [refPreviews, setRefPreviews] = useState<string[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genErr, setGenErr] = useState<string | null>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  // 参考图预览 URL 生命周期管理
  useEffect(() => {
    const urls = refFiles.map((f) => URL.createObjectURL(f));
    setRefPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [refFiles]);

  // 打开时拉取真实档案
  useEffect(() => {
    if (!open) return;
    api
      .getProfile()
      .then((p) => {
        setFields((f) => ({
          ...f,
          nickname: p.nickname || f.nickname,
          height: p.height || f.height,
          weight: p.weight || f.weight,
          bodyNotes: p.bodyNotes || f.bodyNotes,
          gender: p.gender || f.gender,
          age: p.age || f.age,
          occupation: p.occupation || f.occupation,
        }));
        if (p.fullBody) setFullBody(p.fullBody);
      })
      .catch(() => {});
  }, [open]);

  const rows: { key: keyof Fields; label: string; latin: string }[] = [
    { key: "height", label: "身高", latin: "Height" },
    { key: "weight", label: "体重", latin: "Weight" },
    { key: "bodyNotes", label: "身材特征", latin: "Body notes" },
  ];

  const saveText = async () => {
    setSaving(true);
    try {
      await api.updateProfile(fields);
      setSaved(true);
      setEditing(false);
      onProfileChange?.();
    } catch {
      setSaved(false);
    } finally {
      setSaving(false);
    }
  };

  // 追加参考图（上传多选），最多 3 张
  const onPickRefs: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (picked.length) setRefFiles((prev) => [...prev, ...picked].slice(0, 3));
  };

  // 拍照得到一张参考图
  const onCameraShot = (blob: Blob) => {
    const file = new File([blob], `shot_${Date.now()}.jpg`, { type: "image/jpeg" });
    setRefFiles((prev) => [...prev, file].slice(0, 3));
    setCameraOpen(false);
  };

  const removeRef = (idx: number) => {
    setRefFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const doGenerate = async () => {
    if (!refFiles.length) {
      setGenErr("请先上传或拍摄 1~3 张参考图");
      return;
    }
    setGenerating(true);
    setGenErr(null);
    try {
      const p = await api.generateAvatar(refFiles, fields);
      if (p.fullBody) setFullBody(p.fullBody);
      setGenOpen(false);
      setRefFiles([]);
      onProfileChange?.();
    } catch (e: any) {
      setGenErr(e?.message || "生成失败，请重试");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 z-40 bg-ink/55"
          />
          <motion.div
            initial={{ opacity: 0, y: 26, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-1/2 top-1/2 z-40 w-[326px] -translate-x-1/2 -translate-y-1/2 bg-white"
          >
            {/* 档案头 */}
            <div className="flex items-start justify-between border-b border-ink/25 px-4 pb-2.5 pt-3.5">
              <div>
                <Kicker>我的形象 / Body File</Kicker>
                <p className="mt-1.5 font-display text-[17px] leading-none text-ink">{fields.nickname}</p>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="font-latin text-[11px] italic text-ink/50">{profileFallback.fileNo}</span>
                <button onClick={onClose} className="text-ink/45 active:opacity-50">
                  <X className="h-4 w-4" strokeWidth={1.2} />
                </button>
              </div>
            </div>

            <div className="flex">
              {/* AI 生成白底全身形象图 */}
              <div className="relative w-[42%] shrink-0 border-r border-ink/20">
                <div className="h-[248px] bg-white">
                  {fullBody ? (
                    <ImageWithFallback
                      src={fullBody}
                      alt="AI 生成的白底全身形象图"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center">
                      <Sparkles className="h-5 w-5 text-ink/30" strokeWidth={1.3} />
                      <p className="font-body text-[9px] leading-[1.7] text-ink/45">
                        还没有形象图
                        <br />
                        上传照片生成
                      </p>
                    </div>
                  )}
                </div>
                <span className="absolute left-0 top-0 border-b border-r border-ink/25 bg-white px-1.5 py-1 font-body text-[7px] rx-track-sm text-ink">
                  AI FIGURE
                </span>
                <button
                  onClick={() => setGenOpen(true)}
                  className="flex w-full items-center justify-center gap-1 border-t border-ink/20 bg-ink py-1.5 font-body text-[9px] rx-track-sm text-white active:opacity-70"
                >
                  <Sparkles className="h-2.5 w-2.5" strokeWidth={1.6} />
                  {fullBody ? "重新生成" : "生成形象"}
                </button>
              </div>

              {/* 信息 */}
              <div className="flex-1 px-3.5 py-3">
                {/* 昵称 */}
                <div className="border-b border-ink/12 pb-2">
                  <p className="font-body text-[7px] uppercase rx-track text-ink/45">01 · Nickname</p>
                  {editing ? (
                    <input
                      value={fields.nickname}
                      onChange={(e) => setFields((f) => ({ ...f, nickname: e.target.value }))}
                      className="mt-1 w-full border-b border-ink/40 bg-transparent pb-0.5 font-display text-[14px] text-ink outline-none"
                    />
                  ) : (
                    <p className="mt-1 font-display text-[14px] text-ink">{fields.nickname}</p>
                  )}
                </div>

                {rows.map((r, i) => (
                  <div key={r.key} className="border-b border-ink/12 py-2">
                    <p className="font-body text-[7px] uppercase rx-track text-ink/45">
                      0{i + 2} · {r.latin}
                    </p>
                    {editing ? (
                      r.key === "bodyNotes" ? (
                        <textarea
                          value={fields[r.key]}
                          onChange={(e) => setFields((f) => ({ ...f, bodyNotes: e.target.value }))}
                          rows={3}
                          className="mt-1 w-full resize-none border border-ink/25 bg-transparent p-1.5 font-body text-[11px] leading-[1.7] text-ink outline-none"
                        />
                      ) : (
                        <input
                          value={fields[r.key]}
                          onChange={(e) => setFields((f) => ({ ...f, [r.key]: e.target.value }))}
                          className="mt-1 w-full border-b border-ink/40 bg-transparent pb-0.5 font-display text-[14px] text-ink outline-none"
                        />
                      )
                    ) : (
                      <p
                        className={`mt-1 text-ink ${
                          r.key === "bodyNotes"
                            ? "font-body text-[11px] leading-[1.75]"
                            : "font-display text-[14px]"
                        }`}
                      >
                        {fields[r.key]}
                      </p>
                    )}
                  </div>
                ))}

                <p className="mt-2 font-latin text-[9px] italic leading-[1.6] text-ink/45">
                  资料越准，AI 推荐越懂你 — 随时可以更新。
                </p>
              </div>
            </div>

            {/* 操作 */}
            <div className="flex border-t border-ink/25">
              <button
                onClick={() => {
                  setEditing((e) => !e);
                  setSaved(false);
                }}
                className="flex flex-1 items-center justify-center gap-1.5 border-r border-ink/20 py-3 font-body text-[10px] rx-track-sm text-ink active:opacity-60"
              >
                <Pencil className="h-3 w-3" strokeWidth={1.4} />
                {editing ? "取消编辑" : "编辑"}
              </button>
              <button
                onClick={saveText}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-1.5 bg-ink py-3 font-body text-[10px] rx-track-sm text-white active:opacity-70 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.8} />
                ) : saved ? (
                  <Check className="h-3 w-3" strokeWidth={1.8} />
                ) : null}
                {saving ? "保存中" : saved ? "已保存" : "保存"}
              </button>
            </div>
          </motion.div>

          {/* 生成形象浮层 */}
          <AnimatePresence>
            {genOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => !generating && setGenOpen(false)}
                  className="absolute inset-0 z-50 bg-ink/60"
                />
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 14 }}
                  className="absolute left-1/2 top-1/2 z-50 w-[320px] -translate-x-1/2 -translate-y-1/2 bg-paper p-5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <Kicker>生成形象 / Generate</Kicker>
                      <h3 className="mt-1.5 font-display text-[17px] text-ink">上传照片，生成全身形象</h3>
                    </div>
                    {!generating && (
                      <button onClick={() => setGenOpen(false)} className="text-ink/45 active:opacity-50">
                        <X className="h-4 w-4" strokeWidth={1.2} />
                      </button>
                    )}
                  </div>

                  <p className="mt-2 font-body text-[10px] leading-[1.8] text-ash">
                    上传或拍摄 1~3 张用户画像照 / 自拍，结合下方资料生成标准全身形象图。
                  </p>

                  {/* 参考图输入：上传 或 拍照 */}
                  <input
                    ref={refInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={onPickRefs}
                  />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => refInputRef.current?.click()}
                      disabled={refFiles.length >= 3}
                      className="flex items-center justify-center gap-2 border border-dashed border-ink/30 py-3.5 font-body text-[11px] text-ink/70 active:bg-ink/5 disabled:opacity-40"
                    >
                      <Upload className="h-3.5 w-3.5" strokeWidth={1.4} />
                      上传照片
                    </button>
                    <button
                      onClick={() => setCameraOpen(true)}
                      disabled={refFiles.length >= 3}
                      className="flex items-center justify-center gap-2 border border-dashed border-ink/30 py-3.5 font-body text-[11px] text-ink/70 active:bg-ink/5 disabled:opacity-40"
                    >
                      <Camera className="h-3.5 w-3.5" strokeWidth={1.4} />
                      拍照
                    </button>
                  </div>

                  {/* 已选参考图预览 + 删除 */}
                  {refPreviews.length > 0 && (
                    <div className="mt-3 flex gap-2">
                      {refPreviews.map((src, i) => (
                        <div key={i} className="relative h-16 w-16 overflow-hidden border border-ink/15 bg-white">
                          <img src={src} alt={`参考图 ${i + 1}`} className="h-full w-full object-cover" />
                          <button
                            onClick={() => removeRef(i)}
                            className="absolute right-0 top-0 bg-ink/70 p-0.5 text-white active:opacity-60"
                            aria-label="删除"
                          >
                            <Trash2 className="h-2.5 w-2.5" strokeWidth={1.6} />
                          </button>
                        </div>
                      ))}
                      <span className="self-end font-body text-[9px] text-ash">{refFiles.length}/3</span>
                    </div>
                  )}

                  {/* 资料：性别 / 年龄 / 职业 */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <label className="block">
                      <span className="font-body text-[8px] uppercase rx-track text-ink/45">性别</span>
                      <select
                        value={fields.gender}
                        onChange={(e) => setFields((f) => ({ ...f, gender: e.target.value }))}
                        className="mt-1 w-full border-b border-ink/30 bg-transparent pb-1 font-display text-[13px] text-ink outline-none"
                      >
                        <option value="女">女</option>
                        <option value="男">男</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="font-body text-[8px] uppercase rx-track text-ink/45">年龄</span>
                      <input
                        value={fields.age}
                        onChange={(e) => setFields((f) => ({ ...f, age: e.target.value }))}
                        placeholder="28"
                        className="mt-1 w-full border-b border-ink/30 bg-transparent pb-1 font-display text-[13px] text-ink outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="font-body text-[8px] uppercase rx-track text-ink/45">职业</span>
                      <input
                        value={fields.occupation}
                        onChange={(e) => setFields((f) => ({ ...f, occupation: e.target.value }))}
                        placeholder="设计师"
                        className="mt-1 w-full border-b border-ink/30 bg-transparent pb-1 font-display text-[13px] text-ink outline-none"
                      />
                    </label>
                  </div>

                  {genErr && <p className="mt-3 font-body text-[10px] text-wine">{genErr}</p>}

                  <button
                    onClick={doGenerate}
                    disabled={generating}
                    className="mt-4 flex w-full items-center justify-center gap-2 bg-ink py-3 font-body text-[11px] rx-track-sm text-white active:opacity-70 disabled:opacity-50"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.6} />
                        正在生成，请稍候…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" strokeWidth={1.6} />
                        开始生成
                      </>
                    )}
                  </button>
                  {generating && (
                    <p className="mt-2 text-center font-body text-[9px] text-ash">
                      调用 AI 生成，通常需要十几秒到几十秒
                    </p>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* 拍摄用户画像照（前置摄像头） */}
          <AnimatePresence>
            {cameraOpen && (
              <CameraCapture
                facingMode="user"
                hint="把人物放进画面，拍一张用作形象参考"
                onClose={() => setCameraOpen(false)}
                onShot={onCameraShot}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
