"use client";
import { ArrowUpRight, ChevronDown, ChevronRight, Mail, MapPin, Menu, MessageCircle, Phone, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { BrandMark } from "@/components/shell/sidebar";
import { ThemeToggle } from "./theme-toggle";
import { Button, cn } from "@/components/ui";
import { SITE, socialLinks, telHref, waHref } from "@/config/site";
import { FEE_CONFIGS } from "@/lib/site/fees";
import { SERVICES } from "@/lib/site/leads";
import { CALC_GROUPS, calcHref } from "./fee-calculators";
import { useScrolled } from "./use-browser";

const SOCIAL_LABEL: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", youtube: "YouTube", x: "X" };
const NAV = [["#listing-check", "Free listing check"], ["#platform", "Platform"], ["#contact", "Contact"]] as const;

function CalculatorsMenu() {
  const [group, setGroup] = React.useState(0);
  return (
    <div className="group/menu relative">
      <button type="button" className="flex h-15 items-center gap-1 text-[13.5px] font-medium text-muted hover:text-ink group-focus-within/menu:text-ink" aria-haspopup="true">Calculators<ChevronDown className="size-3.5 transition-transform group-hover/menu:rotate-180" /></button>
      <div className="invisible absolute top-full left-0 z-50 flex translate-y-1 overflow-hidden rounded-xl border border-line bg-surface opacity-0 shadow-card transition-all group-focus-within/menu:visible group-focus-within/menu:translate-y-0 group-focus-within/menu:opacity-100 group-hover/menu:visible group-hover/menu:translate-y-0 group-hover/menu:opacity-100">
        <ul className="w-56 border-r border-line bg-raised/50 p-1.5">
          {CALC_GROUPS.map((g, i) => (
            <li key={g.label}>
              <button type="button" onMouseEnter={() => setGroup(i)} onFocus={() => setGroup(i)} onClick={() => setGroup(i)}
                className={cn("flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-[13.5px]", group === i ? "bg-surface font-medium text-accent shadow-sm" : "text-muted hover:text-ink")}>
                {g.label}<ChevronRight className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <ul className="w-56 p-1.5">
          {CALC_GROUPS[group].ids.map((id) => (
            <li key={id}><a href={calcHref(id)} className="block rounded-md px-3 py-2.5 text-[13.5px] hover:bg-accent hover:text-accent-ink focus:bg-accent focus:text-accent-ink focus:outline-none">{FEE_CONFIGS[id].name} fee calculator</a></li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ServicesMenu() {
  return (
    <div className="group/menu relative">
      <button type="button" className="flex h-15 items-center gap-1 text-[13.5px] font-medium text-muted hover:text-ink" aria-haspopup="true">Services<ChevronDown className="size-3.5 transition-transform group-hover/menu:rotate-180" /></button>
      <div className="invisible absolute top-full left-0 z-50 w-72 translate-y-1 rounded-xl border border-line bg-surface p-1.5 opacity-0 shadow-card transition-all group-focus-within/menu:visible group-focus-within/menu:translate-y-0 group-focus-within/menu:opacity-100 group-hover/menu:visible group-hover/menu:translate-y-0 group-hover/menu:opacity-100">
        {SERVICES.filter((s) => s !== "Something else").map((s) => <a key={s} href="#services" className="block rounded-md px-3 py-2 text-[13.5px] hover:bg-raised">{s}</a>)}
      </div>
    </div>
  );
}

export function SiteHeader() {
  const [open, setOpen] = React.useState(false);
  const scrolled = useScrolled();
  return (
    <header className={cn("sticky top-0 z-40 transition-colors", scrolled ? "border-b border-line bg-bg/85 backdrop-blur-md" : "bg-transparent")}>
      <div className="mx-auto flex h-15 max-w-6xl items-center gap-5 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="Shalini_IQ home">
          <BrandMark size={30} />
          <span className="leading-none"><span className="font-royal block text-[19px] font-semibold tracking-[-0.02em] text-ink">Shalini_IQ</span></span>
        </Link>
        <nav className="ml-3 hidden items-center gap-5 lg:flex" aria-label="Site">
          <ServicesMenu />
          <CalculatorsMenu />
          {NAV.map(([href, label]) => <a key={href} href={href} className="text-[13.5px] font-medium text-muted hover:text-ink">{label}</a>)}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <Link href="/account" className="hidden h-9 items-center rounded-md px-3 text-[13px] font-medium text-muted hover:bg-raised hover:text-ink md:inline-flex">Dashboard</Link>
          <a href="#enquiry" className="pulse-ring hidden h-9 items-center rounded-full btn-main px-4 text-[13px] font-semibold text-accent-ink hover:brightness-110 sm:inline-flex">Get free consultation</a>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</Button>
        </div>
      </div>
      {open && (
        <nav className="max-h-[75vh] overflow-y-auto border-t border-line bg-surface px-4 py-3 lg:hidden" aria-label="Site mobile" onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}>
          <details className="group"><summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-2 py-2.5 text-[15px] font-medium">Services<ChevronDown className="size-4 group-open:rotate-180" /></summary>
            <ul className="pb-2 pl-3">{SERVICES.filter((s) => s !== "Something else").map((s) => <li key={s}><a href="#services" className="block px-2 py-1.5 text-[14px] text-muted">{s}</a></li>)}</ul></details>
          {CALC_GROUPS.map((g) => (
            <details key={g.label} className="group"><summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-2 py-2.5 text-[15px] font-medium">{g.label}<ChevronDown className="size-4 group-open:rotate-180" /></summary>
              <ul className="pb-2 pl-3">{g.ids.map((id) => <li key={id}><a href={calcHref(id)} className="block px-2 py-1.5 text-[14px] text-muted">{FEE_CONFIGS[id].name}</a></li>)}</ul></details>
          ))}
          {NAV.map(([href, label]) => <a key={href} href={href} className="block rounded-md px-2 py-2.5 text-[15px] font-medium">{label}</a>)}
          <Link href="/account" className="block rounded-md px-2 py-2.5 text-[15px] font-medium">Dashboard</Link>
          <a href="#enquiry" className="mt-2 block rounded-md bg-accent px-2 py-2.5 text-center text-[15px] font-semibold text-accent-ink">Get free consultation</a>
        </nav>
      )}
    </header>
  );
}

function FootCol({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="min-w-0"><p className="text-[14px] font-semibold">{title}</p><ul className="mt-3 space-y-2 text-[13.5px] text-muted">{children}</ul></div>;
}
const FL = ({ href, children, ext }: { href: string; children: React.ReactNode; ext?: boolean }) => (
  <li><a href={href} {...(ext ? { target: "_blank", rel: "noreferrer" } : {})} className="inline-flex items-center gap-1 hover:text-ink"><ChevronRight className="size-3.5 shrink-0 text-faint" />{children}</a></li>
);

export function SiteFooter() {
  const socials = socialLinks();
  return (
    <footer id="contact" className="scroll-mt-16 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-14 pb-10 sm:px-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2"><BrandMark size={30} /><span className="leading-none"><span className="font-royal block text-[18px] font-semibold tracking-[-0.02em] text-ink">Shalini_IQ</span></span></div>
          <p className="mt-3 text-[13.5px] text-muted">Websites, marketing and the Shalini_IQ platform for brands and agencies selling online. Built in Chennai.</p>
          <a href="#enquiry" className="mt-4 inline-flex h-9 items-center rounded-md bg-accent px-3.5 text-[13px] font-semibold text-accent-ink">Get free consultation</a>
        </div>
        <FootCol title="Services">
          {SERVICES.filter((s) => s !== "Something else").map((s) => <FL key={s} href="#services">{s}</FL>)}
        </FootCol>
        <FootCol title="Free tools">
          <FL href="#listing-check">Listing quality check</FL>
          {CALC_GROUPS.flatMap((g) => g.ids).map((id) => <FL key={id} href={calcHref(id)}>{FEE_CONFIGS[id].name} fee calculator</FL>)}
        </FootCol>
        <FootCol title="Shalini_IQ platform">
          <FL href="#platform">What it does</FL>
          <FL href="#pricing">Pricing</FL>
          <FL href="/signup">Start a workspace</FL>
          <FL href="/account">Platform login</FL>
        </FootCol>
        <FootCol title="Contact">
          {SITE.contact.phones.map((p) => <li key={p}><a href={telHref(p)} className="inline-flex items-center gap-2 hover:text-ink"><Phone className="size-4 text-faint" />{p}</a></li>)}
          <li><a href={waHref()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-ink"><MessageCircle className="size-4 text-faint" />WhatsApp {SITE.contact.phones[0]}</a></li>
          {SITE.contact.emails.map((e) => <li key={e}><a href={`mailto:${e}`} className="inline-flex items-center gap-2 break-all hover:text-ink"><Mail className="size-4 shrink-0 text-faint" />{e}</a></li>)}
          {SITE.contact.whatsappChannel && <FL href={SITE.contact.whatsappChannel} ext>Join our WhatsApp channel</FL>}
        </FootCol>
        <FootCol title="Location">
          <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-faint" /><span>{SITE.location.address || SITE.location.city}</span></li>
          {SITE.location.mapUrl && <FL href={SITE.location.mapUrl} ext>Open in Google Maps</FL>}
        </FootCol>
        {socials.length > 0 && (
          <FootCol title="Follow us">
            <li className="flex flex-wrap gap-2">{socials.map(([k, u]) => <a key={k} href={u} target="_blank" rel="noreferrer me" className="inline-flex h-8 items-center gap-1 rounded-full border border-line px-3 text-[12.5px] hover:border-accent hover:text-accent">{SOCIAL_LABEL[k]}<ArrowUpRight className="size-3.5" /></a>)}</li>
          </FootCol>
        )}
        <FootCol title="Policies">
          <FL href="/privacy">Privacy policy</FL>
          <FL href="/refund-policy">Refund & cancellation policy</FL>
          <FL href="/terms">Terms and conditions</FL>
        </FootCol>
      </div>
      <div className="border-t border-line px-4 py-5 pb-24 text-center text-[12px] text-faint">
        <p>© {new Date().getFullYear()} {SITE.company}. All rights reserved.</p>
        <p className="mt-1">Amazon, Flipkart, Myntra, Meesho, JioMart, eBay, Etsy, Blinkit, Zepto, Swiggy Instamart and Meta are trademarks of their owners. We are not affiliated with or endorsed by them.</p>
      </div>
    </footer>
  );
}
