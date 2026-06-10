import Script from "next/script";
import { requireAuthenticatedActor } from "../lib/auth-server";
import { isPdfDraftEnabled } from "../lib/pdf-feature-flags";
import EditorCanvasClient from "./editor-canvas-client";

export const dynamic = "force-dynamic";

export default async function MasterResumePage() {
  await requireAuthenticatedActor();
  const draftPdfEnabled = await isPdfDraftEnabled();

  return (
    <>
      <Script src="/vendor/js-yaml.min.js" strategy="afterInteractive" />
      <EditorCanvasClient draftPdfEnabled={draftPdfEnabled} />
    </>
  );
}
