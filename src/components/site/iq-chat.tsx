"use client";
import { Mail, MessageCircle, Phone, RotateCcw, Send, X } from "lucide-react";
import * as React from "react";
import { cn } from "@/components/ui";
import { SITE, telHref, waHref } from "@/config/site";
import { GREETING, IQ_START, iqReply, type IQMessage, type IQState } from "@/lib/site/iq";
import { submitLead } from "./submit-lead";

const KEY = "entraiq-iq-chat-v1";
type Saved = { messages: IQMessage[]; state: IQState };
const load = (): Saved | null => { try { const raw = localStorage.getItem(KEY); return raw ? (JSON.parse(raw) as Saved) : null; } catch { return null; } };
const save = (v: Saved) => { try { localStorage.setItem(KEY, JSON.stringify({ ...v, messages: v.messages.slice(-60) })); } catch { /* storage unavailable: chat still works */ } };

/** IQ's face: our own mark — two letters in a gradient disc with a small "live" dot. */
export function IQAvatar({ size = 36 }: { size?: number }) {
  return (
    <span className="font-royal relative inline-flex shrink-0 items-center justify-center rounded-full bg-[#0f3d2b] font-bold text-[#4cc38a] shadow-sm ring-1 ring-[#4cc38a]/60" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden>
      IQ<span className="absolute right-0 bottom-0 rounded-full border-2 border-surface bg-pos" style={{ width: size * 0.28, height: size * 0.28 }} />
    </span>
  );
}

/** Renders **bold**, *italic* and line breaks from IQ's replies — nothing else, so no HTML injection. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <React.Fragment key={i}>
          {i > 0 && <br />}
          {line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, j) =>
            part.startsWith("**") ? <strong key={j}>{part.slice(2, -2)}</strong> : part.startsWith("*") && part.length > 2 ? <em key={j}>{part.slice(1, -1)}</em> : <React.Fragment key={j}>{part}</React.Fragment>,
          )}
        </React.Fragment>
      ))}
    </>
  );
}

export function IQChat() {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<IQMessage[]>([]);
  const [state, setState] = React.useState<IQState>(IQ_START);
  const [typing, setTyping] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [nudge, setNudge] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const started = messages.length > 0;

  // Restore the visitor's conversation, and offer a gentle nudge once per visit.
  React.useEffect(() => {
    const saved = load();
    const t1 = setTimeout(() => {
      if (saved?.messages.length) { setMessages(saved.messages); setState(saved.state); }
    }, 0);
    let seen = false;
    try { seen = sessionStorage.getItem(`${KEY}-nudged`) === "1"; } catch { /* ignore */ }
    const t2 = seen ? undefined : setTimeout(() => { setNudge(true); try { sessionStorage.setItem(`${KEY}-nudged`, "1"); } catch { /* ignore */ } }, 12000);
    return () => { clearTimeout(t1); if (t2) clearTimeout(t2); };
  }, []);

  React.useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [messages, typing, open]);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => { document.removeEventListener("keydown", onKey); clearTimeout(t); };
  }, [open]);

  const openChat = () => {
    setOpen(true); setNudge(false);
    if (!started) { const first = [{ ...GREETING, ts: Date.now() }]; setMessages(first); save({ messages: first, state: IQ_START }); }
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || typing) return;
    setInput("");
    const mine: IQMessage = { from: "you", text, ts: Date.now() };
    const base = [...(started ? messages : [{ ...GREETING, ts: Date.now() }]), mine];
    setMessages(base);
    setTyping(true);
    const turn = iqReply(state, text);
    await new Promise((r) => setTimeout(r, 350 + Math.min(900, turn.messages[0].text.length * 4)));
    let next = [...base, ...turn.messages.map((m) => ({ ...m, ts: Date.now() }))];
    if (turn.submit) {
      const res = await submitLead({ kind: "enquiry", name: turn.submit.name, phone: turn.submit.phone, email: turn.submit.email, agency: "", interest: turn.submit.interest, message: "Sent from the IQ chat assistant.", consent: true, website: "" });
      next = [...next, {
        from: "iq", ts: Date.now(),
        text: res.ok
          ? `Done! Your reference is **${res.reference}**. ${res.alert === "sent" ? "The team has been alerted and will call you within one working day." : "For the fastest reply, you can also message us on WhatsApp now."}`
          : `Sorry — that didn't go through (${res.error ?? "network problem"}). Please WhatsApp or call us instead.`,
        actions: [{ label: "WhatsApp us", href: waHref(`Hi, I just sent an enquiry via IQ${res.reference ? ` (${res.reference})` : ""}.`), external: true }, { label: `Call ${SITE.contact.phones[0]}`, href: telHref(SITE.contact.phones[0]) }],
      }];
    }
    setTyping(false);
    setMessages(next);
    setState(turn.state);
    save({ messages: next, state: turn.state });
  };

  const reset = () => { const first = [{ ...GREETING, ts: Date.now() }]; setMessages(first); setState(IQ_START); save({ messages: first, state: IQ_START }); };
  const follow = (href: string) => { if (href.startsWith("#") && window.matchMedia("(max-width: 640px)").matches) setOpen(false); };
  const last = messages[messages.length - 1];

  return (
    <div className="fixed z-50 flex flex-col items-end gap-3" style={{ right: "max(16px, env(safe-area-inset-right, 0px))", bottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}>
      {open && (
        <section role="dialog" aria-label="Chat with IQ" className="overlay-in flex h-[min(600px,calc(100dvh-110px))] w-[min(390px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          <header className="flex items-center gap-3 btn-main px-4 py-3 text-accent-ink">
            <IQAvatar size={38} />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">IQ</p>
              <p className="truncate text-[12px] opacity-80">Shalini_IQ&apos;s assistant · replies instantly</p>
            </div>
            <a href={waHref()} target="_blank" rel="noreferrer" aria-label="WhatsApp us" className="rounded-lg p-1.5 hover:bg-black/10"><MessageCircle className="size-4.5" /></a>
            <a href={telHref(SITE.contact.phones[0])} aria-label={`Call ${SITE.contact.phones[0]}`} className="rounded-lg p-1.5 hover:bg-black/10"><Phone className="size-4.5" /></a>
            {SITE.contact.email && <a href={`mailto:${SITE.contact.email}`} aria-label="Email us" className="rounded-lg p-1.5 hover:bg-black/10"><Mail className="size-4.5" /></a>}
            <button type="button" onClick={reset} aria-label="Start a new chat" className="rounded-lg p-1.5 hover:bg-black/10"><RotateCcw className="size-4.5" /></button>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="rounded-lg p-1.5 hover:bg-black/10"><X className="size-5" /></button>
          </header>

          <div ref={listRef} className="scroll-thin flex-1 space-y-3 overflow-y-auto bg-raised/40 px-3 py-4" aria-live="polite">
            {messages.map((m, i) => (
              <div key={`${m.ts}-${i}`} className={cn("flex gap-2", m.from === "you" && "justify-end")}>
                {m.from === "iq" && <IQAvatar size={26} />}
                <div className={cn("max-w-[82%] space-y-2")}>
                  <div className={cn("rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed break-words", m.from === "iq" ? "rounded-tl-sm border border-line bg-surface" : "rounded-tr-sm bg-accent text-accent-ink")}>
                    <Rich text={m.text} />
                  </div>
                  {m.actions && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.actions.map((a) => <a key={a.label} href={a.href} onClick={() => follow(a.href)} {...(a.external ? { target: "_blank", rel: "noreferrer" } : {})} className="inline-flex h-8 items-center rounded-full bg-accent px-3 text-[12.5px] font-semibold text-accent-ink hover:brightness-110">{a.label}</a>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex gap-2"><IQAvatar size={26} />
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-line bg-surface px-3.5 py-3" aria-label="IQ is typing">
                  {[0, 1, 2].map((d) => <span key={d} className="size-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${d * 140}ms` }} />)}
                </div>
              </div>
            )}
          </div>

          {!typing && last?.from === "iq" && last.chips && (
            <div className="flex gap-1.5 overflow-x-auto border-t border-line px-3 py-2">
              {last.chips.map((c) => <button key={c} type="button" onClick={() => send(c)} className="shrink-0 rounded-full border border-accent/40 bg-accent-soft px-3 py-1.5 text-[12.5px] font-medium whitespace-nowrap text-accent hover:bg-accent hover:text-accent-ink">{c}</button>)}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex items-center gap-2 border-t border-line px-3 py-2.5">
            <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder={state.stage === "idle" ? "Ask IQ anything…" : "Type your answer…"} aria-label="Message IQ" maxLength={400}
              className="h-10 min-w-0 flex-1 rounded-full border border-line bg-surface px-4 text-[14px] outline-none focus:border-accent" />
            <button type="submit" disabled={!input.trim() || typing} aria-label="Send" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink transition-opacity disabled:opacity-40"><Send className="size-4" /></button>
          </form>
          <p className="px-3 pb-2 text-center text-[10.5px] text-faint">IQ is automated and answers from this website. Details you send go only to the Shalini_IQ team.</p>
        </section>
      )}

      {!open && nudge && (
        <div className="overlay-in relative max-w-[260px] rounded-2xl rounded-br-sm border border-line bg-surface px-4 py-3 text-[13px] shadow-card">
          <button type="button" onClick={() => setNudge(false)} aria-label="Dismiss" className="absolute top-1.5 right-1.5 rounded p-0.5 text-faint hover:text-ink"><X className="size-3.5" /></button>
          <button type="button" onClick={openChat} className="pr-3 text-left"><span className="font-semibold">Hi, I&apos;m IQ.</span> Want your Amazon or Flipkart fees worked out in 10 seconds?</button>
        </div>
      )}

      <button type="button" onClick={() => (open ? setOpen(false) : openChat())} aria-expanded={open} aria-label={open ? "Close IQ chat" : "Chat with IQ"}
        className={cn("group flex h-14 items-center gap-2.5 rounded-full btn-main pr-5 pl-2 text-accent-ink shadow-card transition-transform hover:scale-[1.03]", !open && "pulse-ring", open && "pr-2")}>
        {open ? <span className="flex size-10 items-center justify-center"><X className="size-5" /></span> : <><IQAvatar size={40} /><span className="text-[14px] font-semibold">Ask IQ</span></>}
      </button>
    </div>
  );
}
