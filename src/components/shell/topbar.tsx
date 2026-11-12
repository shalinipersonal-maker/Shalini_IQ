"use client";
import * as Popover from "@radix-ui/react-popover";
import { Bell, CalendarDays, Check, ChevronDown, LogOut, Map as MapIcon, Menu as MenuIcon, Moon, RotateCcw, Settings, Sun } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { DEMO_NOTICE } from "@/config/brand";
import { computeInsights } from "@/lib/ai/insights";
import { fmtDate } from "@/lib/dates";
import { CLIENTS } from "@/lib/demo/catalog";
import type { MarketplaceFilter } from "@/lib/demo/types";
import { initials, timeAgo } from "@/lib/format";
import { ROLE_LABEL, useStore } from "@/lib/store";
import { MAX_CUSTOM_DAYS, RANGE_OPTIONS, useScope } from "@/lib/use-scope";
import { toast } from "../shared";
import { Badge, Button, Field, Input, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, Modal, Segmented, Tip, cn } from "../ui";
import { TOUR } from "./nav";

const MP_OPTIONS: { value: MarketplaceFilter; label: string }[] = [{ value: "all", label: "All" }, { value: "amazon", label: "Amazon" }, { value: "flipkart", label: "Flipkart" }];

export function GlobalFilters({ className }: { className?: string }) {
  const scope = useScope();
  const { clientId, marketplace, range, set } = useStore();
  const [customOpen, setCustomOpen] = React.useState(false);
  const [draft, setDraft] = React.useState({ from: scope.from, to: scope.to });
  const rangeLabel = range.preset === "custom" ? `${fmtDate(scope.from)} – ${fmtDate(scope.to)}` : RANGE_OPTIONS.find((r) => r.value === range.preset)!.label;
  const bad = !draft.from || !draft.to || draft.from > draft.to;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Menu>
        <MenuTrigger asChild>
          <Button aria-label="Switch client workspace" className="max-w-52 justify-start">
            <span className="flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold text-white" style={{ background: `hsl(${scope.ds.client.hue} 45% 42%)` }}>{initials(scope.ds.client.name)}</span>
            <span className="truncate">{scope.ds.client.name}</span>
            <ChevronDown className="text-faint" />
          </Button>
        </MenuTrigger>
        <MenuContent align="start" className="w-64">
          <MenuLabel>Client workspace</MenuLabel>
          {CLIENTS.map((c) => (
            <MenuItem key={c.id} onSelect={() => { set({ clientId: c.id }); toast(`Switched to ${c.name}`); }}>
              <span className="flex size-5 items-center justify-center rounded text-[10px] font-semibold text-white" style={{ background: `hsl(${c.hue} 45% 42%)` }}>{initials(c.name)}</span>
              <span className="flex-1"><span className="block leading-tight">{c.name}</span><span className="block text-[11.5px] text-faint">{c.industry}</span></span>
              {c.id === clientId && <Check className="!text-accent" />}
            </MenuItem>
          ))}
          <MenuSeparator />
          <MenuItem asChild><Link href="/clients">Manage clients</Link></MenuItem>
        </MenuContent>
      </Menu>
      <Segmented label="Marketplace" value={marketplace} onChange={(v) => set({ marketplace: v })} options={MP_OPTIONS} />
      <Menu>
        <MenuTrigger asChild>
          <Button aria-label="Change date range"><CalendarDays className="text-muted" /><span className="whitespace-nowrap">{rangeLabel}</span><ChevronDown className="text-faint" /></Button>
        </MenuTrigger>
        <MenuContent align="start">
          <MenuLabel>Date range · data through {fmtDate(scope.ds.lastDate)}</MenuLabel>
          {RANGE_OPTIONS.map((o) => (
            <MenuItem key={o.value} onSelect={() => { if (o.value === "custom") { setDraft({ from: scope.from, to: scope.to }); setCustomOpen(true); } else set({ range: { ...range, preset: o.value } }); }}>
              <span className="flex-1">{o.label}</span>
              {range.preset === o.value && <Check className="!text-accent" />}
            </MenuItem>
          ))}
        </MenuContent>
      </Menu>
      <Modal open={customOpen} onOpenChange={setCustomOpen} title="Custom date range" description={`Up to ${MAX_CUSTOM_DAYS} days, so a comparison period is always available.`}
        footer={<><Button onClick={() => setCustomOpen(false)}>Cancel</Button><Button variant="primary" disabled={bad} onClick={() => { set({ range: { preset: "custom", ...draft } }); setCustomOpen(false); }}>Apply range</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From"><Input type="date" value={draft.from} min={scope.ds.firstDate} max={scope.ds.lastDate} onChange={(e) => setDraft({ ...draft, from: e.target.value })} /></Field>
          <Field label="To" error={bad ? "End date must be on or after the start date" : undefined}><Input type="date" value={draft.to} min={scope.ds.firstDate} max={scope.ds.lastDate} onChange={(e) => setDraft({ ...draft, to: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}

function Notifications() {
  const scope = useScope();
  const cfg = useStore((s) => s.settings.ai);
  const read = useStore((s) => s.readNotifs);
  const set = useStore((s) => s.set);
  const items = React.useMemo(() => {
    const ins = computeInsights(scope, cfg).filter((i) => i.impact === "High" && i.category !== "summary").slice(0, 4).map((i) => ({ id: i.id, title: i.title, sub: "AI insight · demo-generated", href: i.link?.href ?? "/ai" }));
    const act = scope.ds.activity.slice(0, 3).map((a) => ({ id: a.id, title: a.text, sub: `${a.actor} · ${timeAgo(a.ts)}`, href: "/overview" }));
    return [...ins, ...act];
  }, [scope, cfg]);
  const unread = items.filter((i) => !read.includes(i.id)).length;
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Notifications, ${unread} unread`} className="relative">
          <Bell />
          {unread > 0 && <span className="absolute top-1 right-1 flex size-3.5 items-center justify-center rounded-full bg-neg text-[9px] font-semibold text-white">{unread}</span>}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} className="overlay-in z-50 w-[min(360px,calc(100vw-1.5rem))] rounded-lg border border-line bg-surface shadow-card">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <p className="text-[13.5px] font-semibold">Notifications</p>
            <button type="button" className="text-[12.5px] font-medium text-accent disabled:text-faint" disabled={!unread} onClick={() => set({ readNotifs: [...new Set([...read, ...items.map((i) => i.id)])] })}>Mark all as read</button>
          </div>
          <ul className="max-h-96 overflow-y-auto py-1">
            {items.map((i) => (
              <li key={i.id}>
                <Popover.Close asChild>
                  <Link href={i.href} onClick={() => set({ readNotifs: [...new Set([...read, i.id])] })} className="flex gap-2.5 px-4 py-2.5 hover:bg-raised">
                    <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", read.includes(i.id) ? "bg-transparent" : "bg-accent")} />
                    <span><span className="block text-[13px] leading-snug">{i.title}</span><span className="text-[12px] text-faint">{i.sub}</span></span>
                  </Link>
                </Popover.Close>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  const { session, theme, set, signOut, resetDemo } = useStore();
  const [confirmReset, setConfirmReset] = React.useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-5">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu} aria-label="Open navigation"><MenuIcon /></Button>
        <GlobalFilters className="hidden lg:flex" />
        <div className="ml-auto flex items-center gap-1">
          <Tip text={DEMO_NOTICE}><span><Badge tone="accent" className="mr-1 px-2 py-1 font-semibold tracking-wide">DEMO ENVIRONMENT</Badge></span></Tip>
          <Menu>
            <MenuTrigger asChild><Button variant="ghost" className="hidden sm:inline-flex"><MapIcon />Demo tour</Button></MenuTrigger>
            <MenuContent className="w-80">
              <MenuLabel>Presentation sequence</MenuLabel>
              {TOUR.map((t, i) => (
                <MenuItem key={t.href} onSelect={() => router.push(t.href)}>
                  <span className="tnum flex size-5 shrink-0 items-center justify-center rounded-full bg-raised text-[11px] font-semibold text-muted">{i + 1}</span>
                  <span><span className="block leading-tight">{t.title}</span><span className="block text-[11.5px] text-faint">{t.note}</span></span>
                </MenuItem>
              ))}
            </MenuContent>
          </Menu>
          <Notifications />
          <Button variant="ghost" size="icon" aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} onClick={() => set({ theme: theme === "dark" ? "light" : "dark" })}>{theme === "dark" ? <Sun /> : <Moon />}</Button>
          <Menu>
            <MenuTrigger asChild>
              <button type="button" aria-label="Account menu" className="ml-1 flex size-8 items-center justify-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent">{initials(session?.name ?? "D U")}</button>
            </MenuTrigger>
            <MenuContent className="w-60">
              <div className="px-2 py-1.5">
                <p className="text-[13px] font-medium">{session?.name}</p>
                <p className="text-[12px] text-faint">{session ? ROLE_LABEL[session.role] : ""} · demo session</p>
              </div>
              <MenuSeparator />
              <MenuItem asChild><Link href="/settings"><Settings />Settings</Link></MenuItem>
              <MenuItem onSelect={() => setConfirmReset(true)}><RotateCcw />Reset demo data</MenuItem>
              <MenuSeparator />
              <MenuItem onSelect={() => { signOut(); router.push("/login"); }}><LogOut />Sign out</MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </div>
      <div className="scroll-thin overflow-x-auto border-t border-line px-3 py-2 lg:hidden"><GlobalFilters /></div>
      <Modal open={confirmReset} onOpenChange={setConfirmReset} title="Reset demo data?" description="Restores the workspace to its starting state."
        footer={<><Button onClick={() => setConfirmReset(false)}>Cancel</Button><Button variant="danger" onClick={() => { resetDemo(); setConfirmReset(false); toast("Demo data reset"); }}>Reset demo data</Button></>}>
        <p className="text-[13.5px] text-muted">This clears campaign edits, created campaigns, saved creatives, uploads, report history, reviewed insights, added users and settings changes stored in this browser. The sample sales and advertising data is regenerated and is not affected.</p>
      </Modal>
    </header>
  );
}
