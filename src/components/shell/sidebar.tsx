"use client";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEMO_NOTICE } from "@/config/brand";
import { useStore } from "@/lib/store";
import { Tip, cn } from "../ui";
import { NAV } from "./nav";

export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden className="shrink-0">
      <rect width="28" height="28" rx="7" fill="var(--accent)" />
      <text x="6.6" y="19.6" fontFamily="Georgia, serif" fontStyle="italic" fontSize="15.5" fontWeight="600" fill="var(--accent-ink)">S</text>
      <circle cx="19.5" cy="18.5" r="2.6" fill="none" stroke="var(--accent-ink)" strokeWidth="2" />
      <path d="M21.4 20.4l1.9 1.9" stroke="var(--accent-ink)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Sidebar({ mobile, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const path = usePathname();
  const brand = useStore((s) => s.brand);
  const collapsedPref = useStore((s) => s.sidebarCollapsed);
  const set = useStore((s) => s.set);
  const collapsed = !mobile && collapsedPref;
  return (
    <aside className={cn("flex h-full shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200", mobile ? "w-full border-0" : collapsed ? "w-[60px]" : "w-[236px]")}>
      <div className={cn("flex h-14 items-center gap-2.5 border-b border-line", collapsed ? "justify-center px-0" : "px-4")}>
        <BrandMark />
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[14px] font-semibold tracking-tight">{brand.productName}</p>
            <p className="truncate text-[11px] text-faint">{brand.tagline}</p>
          </div>
        )}
      </div>
      <nav className="scroll-thin flex-1 overflow-y-auto px-2 py-3" aria-label="Main">
        {NAV.map((g) => (
          <div key={g.group} className="mb-4">
            {!collapsed ? <p className="mb-1 px-2 text-[11.5px] font-medium text-faint">{g.group}</p> : <div className="mx-2 mb-2 h-px bg-line" />}
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = path === it.href || path.startsWith(it.href + "/");
                const link = (
                  <Link href={it.href} onClick={onNavigate} aria-current={active ? "page" : undefined}
                    className={cn("flex h-8 items-center gap-2.5 rounded-md text-[13px] transition-colors", collapsed ? "justify-center px-0" : "px-2", active ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-raised hover:text-ink")}>
                    <it.icon className="size-4 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                    {!collapsed && <span className="truncate">{it.label}</span>}
                    {!collapsed && it.badge && <span className="ml-auto rounded bg-raised px-1.5 py-px text-[10.5px] text-faint">{it.badge}</span>}
                  </Link>
                );
                return <li key={it.href}>{collapsed ? <Tip text={it.label}>{link}</Tip> : link}</li>;
              })}
            </ul>
          </div>
        ))}
      </nav>
      {!collapsed && (
        <div className="mx-3 mb-3 rounded-lg border border-line bg-raised/60 px-3 py-2.5">
          <p className="text-[11px] font-semibold tracking-wide text-accent">DEMO ENVIRONMENT</p>
          <p className="mt-0.5 text-[11.5px] leading-snug text-muted">{DEMO_NOTICE}</p>
        </div>
      )}
      {!mobile && (
        <button type="button" onClick={() => set({ sidebarCollapsed: !collapsedPref })} className={cn("flex h-10 items-center gap-2 border-t border-line text-[12.5px] text-muted hover:text-ink", collapsed ? "justify-center" : "px-4")} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}>
          {collapsed ? <PanelLeftOpen className="size-4" /> : <><PanelLeftClose className="size-4" />Collapse</>}
        </button>
      )}
    </aside>
  );
}
