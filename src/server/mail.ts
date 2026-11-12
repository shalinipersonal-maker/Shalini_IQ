import "server-only";
import { LIVE_APP_NAME } from "@/config/live";

/** Email through Resend's HTTP API (no npm package). RESEND_API_KEY + MAIL_FROM come from the environment. */
export const mailConfigured = () => !!process.env.RESEND_API_KEY && !!process.env.MAIL_FROM;

export async function sendMail(to: string, subject: string, text: string, html?: string): Promise<boolean> {
  if (!mailConfigured()) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, text, ...(html ? { html } : {}) }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** A plain, branded email body with one button. */
export function buttonEmail(heading: string, body: string, button: string, href: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#14213d">
<h2 style="font-size:20px;margin:0 0 12px">${esc(heading)}</h2>
<p style="font-size:15px;line-height:1.5;margin:0 0 20px">${esc(body)}</p>
<a href="${esc(href)}" style="display:inline-block;background:#0f3d2b;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:8px">${esc(button)}</a>
<p style="font-size:12px;color:#6b7280;margin:24px 0 0">If you didn't ask for this, you can ignore this email. ${LIVE_APP_NAME}.</p></div>`;
}
