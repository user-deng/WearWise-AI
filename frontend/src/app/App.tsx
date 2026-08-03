import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { StoreProvider, useStore } from "./lib/store";
import { TodayTab } from "./components/TodayTab";
import { ClosetTab } from "./components/ClosetTab";
import { PrescriptionTab } from "./components/PrescriptionTab";
import { AuditionFlow } from "./components/AuditionFlow";
import { TabBar } from "./components/TabBar";

export default function App() {
  return (
    <StoreProvider>
      <div className="flex min-h-full w-full items-center justify-center bg-[#221f1c]">
        {/* iPhone 390 × 844 */}
        <div className="relative flex h-[844px] w-[390px] flex-col overflow-hidden bg-ivory font-body text-ink antialiased shadow-[0_40px_100px_-30px_rgba(0,0,0,0.7)]">
          <Screens />
          <TabBar />
          <AuditionFlow />
        </div>
      </div>
    </StoreProvider>
  );
}

function Screens() {
  const { tab } = useStore();

  return (
    <div className="relative flex-1 overflow-hidden" style={{ perspective: 1400 }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, rotateY: 7, x: 26 }}
          animate={{ opacity: 1, rotateY: 0, x: 0 }}
          exit={{ opacity: 0, rotateY: -7, x: -26 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
          style={{ transformOrigin: "left center" }}
        >
          {tab === "today" && <TodayTab />}
          {tab === "closet" && <ClosetTab />}
          {tab === "rx" && <PrescriptionTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
