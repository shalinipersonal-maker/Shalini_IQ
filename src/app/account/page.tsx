import type { Metadata } from "next";
import { Suspense } from "react";
import { LiveAccount } from "@/components/live/live-account";
import { LIVE_APP_NAME } from "@/config/live";
import { ROYAL } from "../site-fonts";

export const metadata: Metadata = {
  title: `${LIVE_APP_NAME} — live test`,
  description: `Sign in with your own email to test ${LIVE_APP_NAME} with your real accounts.`,
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <div className={`${ROYAL} min-h-dvh`}>
      <Suspense>
        <LiveAccount />
      </Suspense>
    </div>
  );
}
