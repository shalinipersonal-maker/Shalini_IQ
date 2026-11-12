"use client";
import { Palette } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { StudioEditor } from "@/components/studio/editor";
import { EmptyState } from "@/components/ui";
import { useStore } from "@/lib/store";

function EditorRoute() {
  const id = useSearchParams().get("id");
  // Read once per id: the editor owns the document while it is open and writes changes back itself.
  const project = React.useMemo(() => useStore.getState().projects.find((p) => p.id === id), [id]);
  if (!project) return <div className="p-10"><EmptyState icon={<Palette />} title="Creative not found" body="It may have been deleted, or the demo data was reset." action={<Link href="/studio" className="text-[13px] font-medium text-accent hover:underline">Back to Creative Studio</Link>} /></div>;
  return <StudioEditor key={project.id} project={project} />;
}
export default function Page() {
  return <React.Suspense fallback={null}><EditorRoute /></React.Suspense>;
}
