import React from "react";

/**
 * 头像组件：把「全身形象图」裁切出头部区域，圆形展示。
 *
 * 人物形象生成产出的是竖版 2:3 全身影棚照，人物居中站立，
 * 头部大致位于画面 顶部 ~6~14% 的水平居中处。用 background 放大并
 * 定位到头部区域，即可在小圆圈里只显示「头」。
 *
 * mode="head"  用于展示生成的全身图 → 裁头
 * mode="cover" 用于普通方形头像/兜底图 → 直接铺满
 */
export function HeadAvatar({
  src,
  alt,
  className = "",
  mode = "head",
}: {
  src: string;
  alt?: string;
  className?: string;
  mode?: "head" | "cover";
}) {
  const style: React.CSSProperties =
    mode === "head"
      ? {
          backgroundImage: `url("${src}")`,
          backgroundRepeat: "no-repeat",
          // 生成图为 1024×1536 全身照，头部约在画面顶部 6%~20%、水平居中。
          // 放大约 4.5 倍并对准头部（经真实生成图标定）。
          backgroundSize: "450% auto",
          backgroundPosition: "52% 4%",
        }
      : {
          backgroundImage: `url("${src}")`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center",
        };

  return (
    <div
      role="img"
      aria-label={alt}
      className={className}
      style={style}
    />
  );
}
