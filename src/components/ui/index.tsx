"use client";
import * as D from "@radix-ui/react-dialog";
import * as DM from "@radix-ui/react-dropdown-menu";
import * as SW from "@radix-ui/react-switch";
import * as T from "@radix-ui/react-tabs";
import * as TT from "@radix-ui/react-tooltip";
import { clsx, type ClassValue } from "clsx";
import { X } from "lucide-react";
import * as React from "react";
import { twMerge } from "tailwind-merge";

export const cn = (...a: ClassValue[]) => twMerge(clsx(a));

/* ---------- Button ---------- */
type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "ai";
const BTN: Record<BtnVariant, string> = {
  primary: "bg-accent text-accent-ink hover:brightness-110 shadow-sm",
  secondary: "bg-surface text-ink border border-line hover:bg-raised",
  ghost: "text-muted hover:text-ink hover:bg-raised",
  danger: "bg-neg-soft text-neg hover:brightness-95 border border-transparent",
  ai: "bg-ai-soft text-ai hover:brightness-95 dark:hover:brightness-125",
};
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: BtnVariant; size?: "sm" | "md" | "icon" }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = "secondary", size = "md", className, type = "button", ...p }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
        size === "sm" ? "h-7 px-2.5 text-[12.5px]" : size === "icon" ? "size-8" : "h-8.5 px-3 text-[13px]",
        BTN[variant],
        className,
      )}
      {...p}
    />
  );
});

/* ---------- Card ---------- */
export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-line bg-surface", className)} {...p} />;
}
export function CardHeader({ title, subtitle, action, className }: { title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-4 pb-3", className)}>
      <div className="min-w-0">
        <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[12.5px] text-muted">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

/* ---------- Badge ---------- */
export type Tone = "neutral" | "pos" | "neg" | "warn" | "accent" | "ai";
const TONE: Record<Tone, string> = {
  neutral: "bg-raised text-muted",
  pos: "bg-pos-soft text-pos",
  neg: "bg-neg-soft text-neg",
  warn: "bg-warn-soft text-warn",
  accent: "bg-accent-soft text-accent",
  ai: "bg-ai-soft text-ai",
};
export function Badge({ tone = "neutral", className, dot, children }: { tone?: Tone; className?: string; dot?: boolean; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap [&_svg]:size-3", TONE[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ---------- Form controls ---------- */
const CONTROL = "h-8.5 w-full rounded-md border border-line bg-surface px-2.5 text-[13px] text-ink placeholder:text-faint transition-colors hover:border-line-strong focus:border-accent focus:outline-none";
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn(CONTROL, className)} {...p} />;
});
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cn(CONTROL, "h-auto py-2", className)} {...p} />;
});
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...p }, ref) {
  return <select ref={ref} className={cn(CONTROL, "cursor-pointer pr-7", className)} {...p} />;
});
export function Field({ label, error, hint, children, className }: { label: string; error?: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-[12px] font-medium text-muted">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[12px] text-neg">{error}</span> : hint ? <span className="mt-1 block text-[12px] text-faint">{hint}</span> : null}
    </label>
  );
}
export function Segmented<V extends string>({ value, onChange, options, className, label }: { value: V; onChange: (v: V) => void; options: { value: V; label: React.ReactNode }[]; className?: string; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex h-8.5 items-center rounded-md border border-line bg-raised p-0.5", className)}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={cn("h-full rounded-[5px] px-2.5 text-[12.5px] font-medium whitespace-nowrap transition-colors", value === o.value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
export function Switch({ checked, onCheckedChange, disabled, label }: { checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <SW.Root checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} aria-label={label}
      className="relative h-5 w-9 shrink-0 rounded-full bg-line-strong transition-colors data-[state=checked]:bg-accent disabled:opacity-50">
      <SW.Thumb className="block size-4 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px]" />
    </SW.Root>
  );
}

/* ---------- Modal & Sheet ---------- */
export function Modal({ open, onOpenChange, title, description, children, footer, size = "md" }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; children: React.ReactNode; footer?: React.ReactNode; size?: "md" | "lg" | "xl" }) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <D.Content className={cn("overlay-in fixed top-1/2 left-1/2 z-50 flex max-h-[88vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-line bg-surface shadow-card", size === "md" ? "max-w-lg" : size === "lg" ? "max-w-2xl" : "max-w-4xl")}>
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <D.Title className="text-[15px] font-semibold">{title}</D.Title>
              {description ? <D.Description className="mt-0.5 text-[12.5px] text-muted">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
            </div>
            <D.Close asChild><Button variant="ghost" size="icon" aria-label="Close"><X /></Button></D.Close>
          </div>
          <div className="scroll-thin overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
export function Sheet({ open, onOpenChange, title, description, children, side = "right", wide }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: React.ReactNode; children: React.ReactNode; side?: "right" | "left"; wide?: boolean }) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <D.Content className={cn("fixed inset-y-0 z-50 flex w-full flex-col border-line bg-surface shadow-card", side === "right" ? "right-0 border-l" : "left-0 border-r", wide ? "max-w-3xl" : side === "left" ? "max-w-[272px]" : "max-w-xl")}>
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <D.Title className="truncate text-[15px] font-semibold">{title}</D.Title>
              <D.Description asChild><div className="mt-0.5 text-[12.5px] text-muted">{description ?? <span className="sr-only">{title}</span>}</div></D.Description>
            </div>
            <D.Close asChild><Button variant="ghost" size="icon" aria-label="Close"><X /></Button></D.Close>
          </div>
          <div className="scroll-thin flex-1 overflow-y-auto">{children}</div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/* ---------- Menu ---------- */
export const Menu = DM.Root;
export const MenuTrigger = DM.Trigger;
export function MenuContent({ className, align = "end", ...p }: DM.DropdownMenuContentProps) {
  return (
    <DM.Portal>
      <DM.Content align={align} sideOffset={6} className={cn("overlay-in z-50 min-w-48 rounded-lg border border-line bg-surface p-1 shadow-card", className)} {...p} />
    </DM.Portal>
  );
}
export function MenuItem({ className, ...p }: DM.DropdownMenuItemProps) {
  return <DM.Item className={cn("flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-ink outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-45 data-[highlighted]:bg-raised [&_svg]:size-4 [&_svg]:text-muted", className)} {...p} />;
}
export const MenuLabel = ({ children }: { children: React.ReactNode }) => <DM.Label className="px-2 pt-1.5 pb-1 text-[11.5px] font-medium text-faint">{children}</DM.Label>;
export const MenuSeparator = () => <DM.Separator className="my-1 h-px bg-line" />;

/* ---------- Tabs ---------- */
export const Tabs = T.Root;
export function TabsList({ className, ...p }: T.TabsListProps) {
  return <T.List className={cn("scroll-thin flex gap-5 overflow-x-auto border-b border-line", className)} {...p} />;
}
export function TabsTrigger({ className, ...p }: T.TabsTriggerProps) {
  return <T.Trigger className={cn("-mb-px border-b-2 border-transparent pb-2.5 text-[13px] font-medium whitespace-nowrap text-muted transition-colors hover:text-ink data-[state=active]:border-accent data-[state=active]:text-ink", className)} {...p} />;
}
export const TabsContent = T.Content;

/* ---------- Tooltip ---------- */
export function Tip({ text, children }: { text: React.ReactNode; children: React.ReactNode }) {
  return (
    <TT.Provider delayDuration={150}>
      <TT.Root>
        <TT.Trigger asChild>{children}</TT.Trigger>
        <TT.Portal>
          <TT.Content sideOffset={6} className="z-[60] max-w-64 rounded-md bg-ink px-2.5 py-1.5 text-[12px] leading-snug text-bg shadow-card">{text}</TT.Content>
        </TT.Portal>
      </TT.Root>
    </TT.Provider>
  );
}

/* ---------- States ---------- */
export const Skeleton = ({ className }: { className?: string }) => <div className={cn("skeleton", className)} />;
export function EmptyState({ icon, title, body, action }: { icon?: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon && <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-raised text-muted [&_svg]:size-5">{icon}</div>}
      <p className="text-[14px] font-semibold">{title}</p>
      {body && <p className="mt-1 max-w-sm text-[13px] text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
