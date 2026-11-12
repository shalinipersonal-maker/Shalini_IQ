"use client";
import * as React from "react";

const subscribeHash = (cb: () => void) => { window.addEventListener("hashchange", cb); return () => window.removeEventListener("hashchange", cb); };
/** The current URL hash ("#calc-amazon"), kept in sync with the address bar. Empty on the server. */
export function useHash(): string {
  return React.useSyncExternalStore(subscribeHash, () => window.location.hash, () => "");
}
/** Remove the hash without adding a history entry, and tell listeners. */
export function clearHash() {
  history.replaceState(null, "", window.location.pathname + window.location.search);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

const subscribeScroll = (cb: () => void) => { window.addEventListener("scroll", cb, { passive: true }); return () => window.removeEventListener("scroll", cb); };
/** True once the page has scrolled past `offset` pixels. */
export function useScrolled(offset = 8): boolean {
  return React.useSyncExternalStore(subscribeScroll, () => window.scrollY > offset, () => false);
}
