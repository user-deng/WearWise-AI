import React from "react";

/** 杂志页码 + 栏目注释 */
export function Folio({
  page,
  label,
  align = "left",
  tone = "ink",
}: {
  page: string;
  label: string;
  align?: "left" | "right";
  tone?: "ink" | "ivory";
}) {
  const color = tone === "ink" ? "text-ink/45" : "text-ivory/60";
  return (
    <div
      className={`flex items-center gap-3 font-body text-[9px] uppercase rx-track ${color} ${
        align === "right" ? "justify-end" : ""
      }`}
    >
      <span>{page}</span>
      <span className={`h-px w-6 ${tone === "ink" ? "bg-ink/25" : "bg-ivory/35"}`} />
      <span>{label}</span>
    </div>
  );
}

/** 小号栏目标签 */
export function Kicker({
  children,
  tone = "ink",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "ink" | "ivory" | "sage" | "wine";
  className?: string;
}) {
  const map = {
    ink: "text-ink/50",
    ivory: "text-ivory/70",
    sage: "text-sage-deep",
    wine: "text-wine",
  } as const;
  return (
    <p className={`font-body text-[9px] uppercase rx-track ${map[tone]} ${className}`}>{children}</p>
  );
}

/** 杂志边注（斜体拉丁小字） */
export function MarginNote({
  children,
  tone = "ink",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "ink" | "ivory";
  className?: string;
}) {
  return (
    <p
      className={`font-latin italic text-[11px] leading-[1.7] ${
        tone === "ink" ? "text-ash" : "text-ivory/55"
      } ${className}`}
    >
      {children}
    </p>
  );
}

/** 情绪标签，杂志贴纸式 */
export function Tag({ children, tone = "ink" }: { children: React.ReactNode; tone?: "ink" | "ivory" }) {
  return (
    <span
      className={`inline-block border px-2 py-[3px] font-body text-[10px] rx-track-sm ${
        tone === "ink" ? "border-ink/25 text-ink/70" : "border-ivory/40 text-ivory/85"
      }`}
    >
      {children}
    </span>
  );
}

/** 细线分隔 */
export function Rule({ tone = "ink", className = "" }: { tone?: "ink" | "ivory"; className?: string }) {
  return <div className={`h-px w-full ${tone === "ink" ? "bg-ink/12" : "bg-ivory/20"} ${className}`} />;
}

/** 方形按钮（无圆角，杂志感） */
export function EditorialButton({
  children,
  onClick,
  variant = "solid",
  tone = "ink",
  className = "",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "solid" | "outline";
  tone?: "ink" | "ivory";
  className?: string;
  disabled?: boolean;
}) {
  const styles =
    variant === "solid"
      ? tone === "ink"
        ? "bg-ink text-ivory"
        : "bg-ivory text-ink"
      : tone === "ink"
        ? "border border-ink/35 text-ink"
        : "border border-ivory/45 text-ivory";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full px-5 py-[13px] font-body text-[12px] rx-track-sm transition-opacity active:opacity-60 disabled:opacity-30 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}
