import dynamic from "next/dynamic";
import { Sidebar, MobileNav } from "@/components/shared/Sidebar";

// Heavy components lazy-loaded — they're interactive overlays, not needed at first paint
const CommandPalette = dynamic(() => import("@/components/shared/CommandPalette").then(m => ({ default: m.CommandPalette })), { ssr: false });
const AIPanel = dynamic(() => import("@/components/ai/ai-panel").then(m => ({ default: m.AIPanel })), { ssr: false });
const QuickLogCall = dynamic(() => import("@/components/shared/quick-log-call").then(m => ({ default: m.QuickLogCall })), { ssr: false });
const QuickAddFab = dynamic(() => import("@/components/quick-add/quick-add-fab").then(m => ({ default: m.QuickAddFab })), { ssr: false });
const KeyboardShortcuts = dynamic(() => import("@/components/shared/keyboard-shortcuts").then(m => ({ default: m.KeyboardShortcuts })), { ssr: false });
const BackgroundTasks = dynamic(() => import("@/components/shared/background-tasks").then(m => ({ default: m.BackgroundTasks })), { ssr: false });

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:bg-emerald-500 focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:text-sm focus:font-medium">
        Skip to content
      </a>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <MobileNav />
        <main id="main-content" className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
      </div>
      <CommandPalette />
      <AIPanel />
      <QuickLogCall />
      <QuickAddFab />
      <KeyboardShortcuts />
      <BackgroundTasks />
    </div>
  );
}
