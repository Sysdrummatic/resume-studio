import Script from "next/script";
import { redirect } from "next/navigation";
import { fetchOnboarding } from "../lib/resume-onboarding-server";
import { shouldStartOnboarding } from "../lib/resume-onboarding";
import { requireAuthenticatedActor } from "../lib/auth-server";
import { isPdfDraftEnabled } from "../lib/pdf-feature-flags";
import EditorCanvasClient from "./editor-canvas-client";

export const dynamic = "force-dynamic";

export default async function MasterResumePage() {
  const actor = await requireAuthenticatedActor();
  if (shouldStartOnboarding(await fetchOnboarding(actor.accessToken, actor.userId))) redirect("/onboarding");
  const draftPdfEnabled = await isPdfDraftEnabled();

  return (
    <>
      <Script src="/vendor/js-yaml.min.js" strategy="afterInteractive" />
      <EditorCanvasClient draftPdfEnabled={draftPdfEnabled} />
    </>
  );
}
