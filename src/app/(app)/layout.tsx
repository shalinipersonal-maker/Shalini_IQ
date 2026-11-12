"use client";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { Sheet, Skeleton } from "@/components/ui";
import { useStore } from "@/lib/store";

function ShellSkeleton() {
  return (
    <div className="flex h-dvh" aria-busy="true" aria-label="Loading workspace">
      <div className="hidden w-[236px] border-r border-line bg-surface p-4 lg:block"><Skeleton className="h-7 w-32" /><div className="mt-8 space-y-3">{Array.from({ length: 9 }, (_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div></div>
      <div className="flex-1 p-6"><Skeleton className="h-8 w-64" /><div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">{Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div><Skeleton className="mt-4 h-72 w-full" /></div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const hydrated = useStore((s) => s.hydrated);
  const session = useStore((s) => s.session);
  const router = useRouter();
  const path = usePathname();
  const [navOpen, setNavOpen] = React.useState(false);
  React.useEffect(() => { if (hydrated && !session) router.replace("/login"); }, [hydrated, session, router]);
  if (!hydrated || !session) return <ShellSkeleton />;
  const fullBleed = path.startsWith("/studio/editor");
  return (
    <div className="flex h-dvh overflow-hidden">
      <div className="hidden lg:block"><Sidebar /></div>
      <Sheet open={navOpen} onOpenChange={setNavOpen} title="Navigation" side="left"><Sidebar mobile onNavigate={() => setNavOpen(false)} /></Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setNavOpen(true)} />
        <main className="scroll-thin flex-1 overflow-y-auto">
          {fullBleed ? children : <div className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6">{children}</div>}
        </main>
      </div>
    </div>
  );
}
