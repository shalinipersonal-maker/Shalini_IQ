"use client";
import * as React from "react";
import { useStore } from "@/lib/store";
import { Toaster } from "./shared";

export function Providers({ children }: { children: React.ReactNode }) {
  const theme = useStore((s) => s.theme);
  const accent = useStore((s) => s.brand.accent);
  const hydrated = useStore((s) => s.hydrated);
  React.useEffect(() => {
    // Persisted demo state is loaded after mount so server and client markup always match.
    Promise.resolve(useStore.persist.rehydrate()).finally(() => useStore.setState({ hydrated: true, theme: "light" })); // every visit opens in light; the ☾ switch is per visit
  }, []);
  React.useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.dataset.accent = accent;
  }, [theme, accent, hydrated]);
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
