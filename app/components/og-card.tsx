import type { CvOgContent } from "../lib/og-image";

export function OgCard({ cv }: { cv: CvOgContent | null }) {
  return (
    <div tw="flex h-full w-full flex-col justify-between bg-slate-900 p-20 text-white">
      <div tw="flex text-4xl font-bold text-emerald-300">OpenCiVera</div>
      {cv ? (
        <div tw="flex flex-col">
          <div tw="flex text-7xl font-bold leading-tight">{cv.name}</div>
          {cv.role ? <div tw="mt-6 flex text-4xl text-slate-300">{cv.role}</div> : null}
        </div>
      ) : (
        <div tw="flex flex-col">
          <div tw="flex text-7xl font-bold leading-tight">Your CV as a LiveCV link</div>
          <div tw="mt-6 flex text-4xl text-slate-300">Build once, share a clean public CV.</div>
        </div>
      )}
      <div tw="flex text-3xl text-slate-400">opencivera</div>
    </div>
  );
}
