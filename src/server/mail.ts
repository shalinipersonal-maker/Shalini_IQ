import "server-only";
import { LIVE_APP_NAME } from "@/config/live";

import { connect } from "node:tls";

/**
 * Email. Two ways, the first one set up wins:
 *  1. Gmail — GMAIL_USER + GMAIL_APP_PASSWORD (a 16-letter Google "App password"). Sends to anyone, free,
 *     no domain needed. Uses Gmail's SMTP server directly (no npm package).
 *  2. Resend — RESEND_API_KEY + MAIL_FROM. Without your own verified domain, Resend only delivers to the
 *     Resend account's own email address.
 */
const gmailUser = () => (process.env.GMAIL_USER ?? "").trim();
const gmailPass = () => (process.env.GMAIL_APP_PASSWORD ?? "").replace(/\s+/g, "");
export const gmailConfigured = () => !!gmailUser() && !!gmailPass();
export const mailConfigured = () => gmailConfigured() || (!!process.env.RESEND_API_KEY && !!process.env.MAIL_FROM);
export const mailMethod = () => (gmailConfigured() ? "Gmail" : process.env.RESEND_API_KEY ? "Resend" : "none");

export let lastMailError = "";

export async function sendMail(to: string, subject: string, text: string, html?: string): Promise<boolean> {
  if (!mailConfigured()) return false;
  try {
    if (gmailConfigured()) { await smtpSend(to, subject, text, html); lastMailError = ""; return true; }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, text, ...(html ? { html } : {}) }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) lastMailError = ((await res.json().catch(() => ({}))) as { message?: string }).message ?? `Resend error ${res.status}`;
    return res.ok;
  } catch (e) {
    lastMailError = e instanceof Error ? e.message : "send failed";
    return false;
  }
}

/* ---------- Minimal SMTP client for Gmail (smtp.gmail.com:465, TLS) ---------- */
const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");
const wrap76 = (s: string) => s.replace(/.{1,76}/g, "$&\r\n");
function smtpSend(to: string, subject: string, text: string, html?: string): Promise<void> {
  const from = gmailUser();
  const boundary = `b_${Math.random().toString(36).slice(2)}`;
  const headers = [
    `From: =?UTF-8?B?${b64(LIVE_APP_NAME)}?= <${from}>`, `To: <${to}>`, `Subject: =?UTF-8?B?${b64(subject)}?=`,
    `Date: ${new Date().toUTCString()}`, `Message-ID: <${Date.now()}.${Math.random().toString(36).slice(2)}@${from.split("@")[1] ?? "mail"}>`, "MIME-Version: 1.0",
  ];
  const body = html
    ? [`Content-Type: multipart/alternative; boundary="${boundary}"`, "", `--${boundary}`, "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", wrap76(b64(text)),
       `--${boundary}`, "Content-Type: text/html; charset=UTF-8", "Content-Transfer-Encoding: base64", "", wrap76(b64(html)), `--${boundary}--`, ""].join("\r\n")
    : ["Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", wrap76(b64(text))].join("\r\n");
  const message = `${headers.join("\r\n")}\r\n${body}`.replace(/\r\n\./g, "\r\n..");

  return new Promise((resolve, reject) => {
    const sock = connect({ host: "smtp.gmail.com", port: 465, servername: "smtp.gmail.com" });
    const timer = setTimeout(() => { sock.destroy(); reject(new Error("Gmail did not answer in time")); }, 20000);
    let buf = "";
    const steps: [string | null, number][] = [
      [null, 220], [`EHLO shalini-iq`, 250], [`AUTH PLAIN ${Buffer.from(`\0${from}\0${gmailPass()}`).toString("base64")}`, 235],
      [`MAIL FROM:<${from}>`, 250], [`RCPT TO:<${to}>`, 250], ["DATA", 354], [`${message}\r\n.`, 250], ["QUIT", 221],
    ];
    let i = 0;
    const fail = (msg: string) => { clearTimeout(timer); sock.destroy(); reject(new Error(msg)); };
    sock.on("error", (e) => fail(`Gmail connection failed: ${e.message}`));
    sock.on("data", (d) => {
      buf += d.toString("utf8");
      const lines = buf.split("\r\n").filter(Boolean);
      const last = lines[lines.length - 1] ?? "";
      if (!/^\d{3} /.test(last) || !buf.endsWith("\r\n")) return; // wait for the full reply
      const code = Number(last.slice(0, 3));
      buf = "";
      const want = steps[i][1];
      if (code !== want) {
        if (code === 535) return fail("Gmail refused the sign-in. Check GMAIL_USER and the 16-letter App password.");
        return fail(`Gmail said: ${last.slice(0, 160)}`);
      }
      i++;
      if (i >= steps.length) { clearTimeout(timer); sock.end(); return resolve(); }
      sock.write(`${steps[i][0]}\r\n`);
    });
  });
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** A plain, branded email body with one button. */
export function buttonEmail(heading: string, body: string, button: string, href: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#14213d">
<h2 style="font-size:20px;margin:0 0 12px">${esc(heading)}</h2>
<p style="font-size:15px;line-height:1.5;margin:0 0 20px">${esc(body)}</p>
<a href="${esc(href)}" style="display:inline-block;background:#3b0f1e;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:8px">${esc(button)}</a>
<p style="font-size:12px;color:#6b7280;margin:24px 0 0">If you didn't ask for this, you can ignore this email. ${LIVE_APP_NAME}.</p></div>`;
}
