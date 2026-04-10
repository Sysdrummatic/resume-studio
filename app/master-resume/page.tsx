import Script from "next/script";
import { requireAuthenticatedActor } from "../lib/auth-server";
import EditorCanvasClient from "./editor-canvas-client";

export const dynamic = "force-dynamic";

export default async function MasterResumePage() {
  await requireAuthenticatedActor();

  return (
    <>
      <Script src="/vendor/js-yaml.min.js" strategy="beforeInteractive" />
      <EditorCanvasClient />
    </>
  );
}
