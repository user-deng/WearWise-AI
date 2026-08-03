import React from "react";
import { motion } from "motion/react";
import { useStore, type TabKey } from "../lib/store";

const TABS: { key: TabKey; label: string; latin: string }[] = [
  { key: "today", label: "今日", latin: "Today" },
  { key: "rx", label: "灵感", latin: "Inspo" },
  { key: "closet", label: "衣橱", latin: "Wardrobe" },
];

export function TabBar() {
  const { tab, setTab } = useStore();

  return (
    <nav className="relative z-30 shrink-0 border-t border-ink/15 bg-ivory">
      <div className="grid grid-cols-3">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="relative flex flex-col items-center gap-1 py-3 active:opacity-60"
            >
              {active && (
                <motion.span
                  layoutId="tab-mark"
                  className="absolute inset-x-6 top-0 h-[2px] bg-ink"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span
                className={`font-display text-[16px] leading-none transition-colors ${
                  active ? "text-ink" : "text-ink/35"
                }`}
              >
                {t.label}
              </span>
              <span
                className={`font-body text-[8px] uppercase rx-track transition-colors ${
                  active ? "text-ink/50" : "text-ink/25"
                }`}
              >
                {t.latin}
              </span>
            </button>
          );
        })}
      </div>
      <div className="h-[18px] bg-ivory">
        <div className="mx-auto mt-1 h-[3px] w-[108px] rounded-full bg-ink/25" />
      </div>
    </nav>
  );
}
