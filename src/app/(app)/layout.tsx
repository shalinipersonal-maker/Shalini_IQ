"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { BrandMark, Sidebar } from "@/components/shell/sidebar";
import { ThemeToggle } from "@/components/site/theme-toggle";
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
  const signIn = useStore((s) => s.signIn);
  const isStudio = path.startsWith("/studio");
  React.useEffect(() => {
    if (!hydrated || session) return;
    // Shalini_IQ build: Creative Studio opens straight into Shalini's own design space (saved in this browser).
    if (isStudio) signIn({ name: "Shalini", role: "admin", email: "shalinipersonal14@gmail.com" });
    else router.replace("/login");
  }, [hydrated, session, router, isStudio, signIn]);
  if (!hydrated || !session) return <ShellSkeleton />;
  const fullBleed = path.startsWith("/studio/editor");
  if (isStudio) {
    return (
      <div className="royal flex h-dvh flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2.5">
          <Link href="/studio" className="flex items-center gap-2"><BrandMark size={26} /><span className="text-[14px] font-semibold">Shalini_IQ</span><span className="text-[13px] text-muted">· Creative Studio</span></Link>
          <nav className="flex items-center gap-3 text-[13px]"><ThemeToggle /><Link href="/studio" className="text-muted hover:text-ink">All designs</Link><Link href="/account#meta" className="rounded-md border border-line px-3 py-1.5 hover:bg-raised">Back to dashboard</Link></nav>
        </header>
        <main className="scroll-thin flex-1 overflow-y-auto">{fullBleed ? children : <div className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6">{children}</div>}</main>
      </div>
    );
  }
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
