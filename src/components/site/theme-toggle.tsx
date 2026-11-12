"use client";
import { Moon, Sun } from "lucide-react";
import { useStore } from "@/lib/store";

/** Dark (wine) / light (blush) switch. The choice is remembered in this browser and applied before first paint. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useStore((s) => s.theme);
  const set = useStore((s) => s.set);
  const dark = theme === "dark";
  return (
    <button type="button" onClick={() => set({ theme: dark ? "light" : "dark" })} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} title={dark ? "Light theme" : "Dark theme"}
      className={`inline-flex size-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:bg-raised hover:text-ink [&_svg]:size-4 ${className}`}>
      {dark ? <Sun /> : <Moon />}
    </button>
  );
}
