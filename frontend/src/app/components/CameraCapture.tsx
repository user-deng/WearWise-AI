import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";

/**
 * 相机拍照浮层（getUserMedia）——录入单品 / 拍摄用户形象参考图 共用。
 * 拍下的画面以 JPEG Blob 通过 onShot 回调返回。
 */
export function CameraCapture({
  onClose,
  onShot,
  facingMode = "environment",
  hint,
}: {
  onClose: () => void;
  onShot: (blob: Blob) => void;
  /** 后置("environment") 拍单品；前置("user") 拍人像 */
  facingMode?: "environment" | "user";
  hint?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        setErr("无法访问相机，请检查浏览器权限，或改用上传图片。");
      }
    })();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode]);

  const shoot = () => {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 720;
    canvas.height = v.videoHeight || 960;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => blob && onShot(blob), "image/jpeg", 0.92);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[70] flex flex-col bg-ink"
    >
      <button onClick={onClose} className="absolute right-5 top-12 z-10 text-ivory/80 active:opacity-50">
        <X className="h-5 w-5" strokeWidth={1.3} />
      </button>
      <div className="flex flex-1 items-center justify-center overflow-hidden">
        {err ? (
          <p className="px-8 text-center font-body text-[12px] leading-[1.9] text-ivory/80">{err}</p>
        ) : (
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        )}
      </div>
      {!err && hint && (
        <p className="pb-2 text-center font-body text-[10px] text-ivory/70">{hint}</p>
      )}
      <div className="flex items-center justify-center pb-12 pt-3">
        {!err && (
          <button
            onClick={shoot}
            className="h-16 w-16 rounded-full border-[3px] border-ivory bg-ivory/20 active:scale-95"
            aria-label="拍照"
          />
        )}
      </div>
    </motion.div>
  );
}
