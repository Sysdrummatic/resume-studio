# AI Demo Resume Generation Workstream

This is a planned workstream layered on top of the existing editor.

It is not a core phase from the product roadmap. Phase F covers public resume rendering and SEO/AEO. This workstream is slated for Phase J (AI & Ecosystem).

This document defines the implementation plan for adding an AI-assisted demo CV generator to the React editor on `/master-resume`.

## Goal

Add a button in the editor that generates a fully fictional but internally consistent CV draft in English.

The generated draft is intended to:

- show how the template looks with realistic content,
- help users understand the editor and output quality,
- remain clearly marked as AI-generated,
- never publish automatically without user action.

## Product decisions

- Scope for phase 1:
  - generate the full document,
  - English only,
  - fictional data only,
  - no user profile data is sent to the model,
  - generated result is inserted as a draft into the existing editor flow.
- Scope for phase 2:
  - optional generation tailored to a pasted job description,
  - still fictional, but aligned to a target role or job ad.
- Safety and abuse control:
  - each user can generate one AI demo CV per 30 days,
  - generated CV must carry an AI badge,
  - revision history must record that the content was AI-generated.

## Recommended model

Recommended option for phase 1: `Gemini 3.1 Flash-Lite Preview`.

Why this is the better fit:

- easiest hosted integration for a Next.js server route,
- supports structured outputs with JSON Schema,
- has a free tier suitable for low-volume rollout,
- no separate infrastructure is required,
- good enough quality for fictional, schema-constrained resume generation.

Alternative option: `Qwen2.5 7B` via `Ollama`.

Why it is not the default choice:

- better for privacy and local hosting,
- but requires a dedicated runtime outside normal serverless deployment,
- adds operational complexity too early for a demo-only feature.

Decision:

- Phase 1 should use `Gemini 3.1 Flash-Lite Preview`.
- `Ollama + Qwen` can be evaluated later if product direction shifts toward self-hosted inference.

## Architecture

The model should not generate YAML directly.

Preferred flow:

1. UI collects a short fictional brief.
2. Frontend calls `POST /api/resume/generate-demo`.
3. Backend sends a prompt plus JSON Schema to the model.
4. Model returns JSON matching `ResumeDocument`.
5. Backend validates and normalizes the result using the existing schema utilities.
6. Frontend replaces the current form state and refreshes the YAML panel via existing serialization logic.
7. User may save draft or publish manually.

This reuses the existing contract in `app/lib/resume-schema.ts` and avoids LLM-generated YAML formatting errors.

## UX plan

Add a new editor section near Draft/Publish actions in `app/master-resume/editor-canvas-client.tsx`.

Phase 1 UI:

- `Generate AI demo CV` button,
- compact modal or inline panel with:
  - target role,
  - seniority,
  - industry,
  - years of experience,
  - primary tech stack,
  - tone/style,
  - optional seed words,
- status messaging:
  - generation in progress,
  - next eligible generation date,
  - validation failure fallback.

Generated result behavior:

- replace the current in-memory form state only after confirmation,
- mark the editor preview with an `AI` badge,
- preset `changeNote` to `AI demo CV generated`,
- do not auto-publish.

## Data and persistence plan

### 1. New usage tracking table

Add a dedicated table, for example `public.ai_resume_generations`, with fields such as:

- `id`,
- `user_id`,
- `locale`,
- `generation_type` such as `demo_full` or future `job_tailored`,
- `provider`,
- `model`,
- `created_at`,
- `request_fingerprint` optional,
- `metadata` optional.

Purpose:

- enforce monthly limits,
- support auditability,
- support future analytics without overloading `profiles`.

### 2. AI marker in resume state

Phase 1 should avoid changing the public YAML contract unless needed for rendering.

Preferred initial approach:

- track AI origin in revision metadata and usage table,
- show AI badge in editor state based on latest generation event,
- if the badge must also appear on published public resumes, extend the YAML contract in a controlled follow-up with fields such as:
  - `meta.ai_generated: true`
  - `meta.ai_generation_type: "demo"`

Recommendation:

- keep phase 1 editor-only badge logic simple,
- add schema-level metadata only if public resume rendering also needs the badge immediately.

### 3. Revision history

Every AI generation should be visible in revision and change notes:

- `AI demo CV generated`,
- future phase 2:
  - `AI job-tailored demo CV generated`.

## Backend implementation plan

### New route

Add `app/api/resume/generate-demo/route.ts`.

Responsibilities:

- authenticate the actor,
- verify monthly quota,
- validate request payload,
- call the LLM provider,
- validate returned JSON,
- normalize with `normalizeResumeDocument`,
- return a safe `ResumeDocument` payload to the client,
- log usage.

### Prompt strategy

The prompt should define:

- the CV must be fictional,
- all sections must be internally consistent,
- dates must form a believable career path,
- skills must match experience,
- education must fit seniority,
- language must be English only,
- no placeholders like `lorem ipsum`,
- output must strictly follow the schema.

### Schema strategy

Use JSON Schema derived from `ResumeDocument`.

Backend output contract should include:

- `resume`,
- `generationMeta`,
- `quota`.

Example metadata:

- `provider: "google"`
- `model: "gemini-3.1-flash-lite-preview"`
- `generationType: "demo_full"`
- `aiGenerated: true`

### Validation and fallbacks

Server-side checks should reject:

- missing required keys,
- empty `name`,
- invalid array shapes,
- implausible numeric values such as invalid skill levels.

If model output fails validation:

- return an error without mutating stored data,
- surface a friendly retry message to the user,
- optionally retry once server-side with a stricter repair prompt.

## Frontend implementation plan

Changes in `app/master-resume/editor-canvas-client.tsx`:

- add AI generation panel and local form state for the generator brief,
- call the new API route,
- apply the returned `ResumeDocument` through existing `updateResume`,
- keep YAML panel synchronized via current serializer,
- expose AI badge state in the editor shell and preview,
- disable button when quota is exhausted,
- show next available date.

Potential supporting changes:

- `app/master-resume/resume-live-preview.tsx` for the badge,
- `app/globals.css` for button, panel, and badge styles.

## Quota and abuse prevention

Rule for phase 1:

- one full AI demo CV generation per user every 30 days.

Enforcement location:

- server-side only,
- never rely on frontend checks for protection.

Behavior:

- API returns `403` or `429` with the next eligible date,
- UI shows a disabled action with explanatory copy,
- successful generations create a usage record immediately.

Recommended policy detail:

- the 30-day window should be calculated from the most recent successful generation,
- failed generations should not consume quota unless the model returned a valid draft to the user.

## Public rendering and badge behavior

Minimum requirement:

- the generated draft is visibly marked as `AI` inside the editor.

Preferred future enhancement:

- if an AI-generated draft is later published, the public resume should also show a small `AI-generated demo` badge.

This can be done in either of two ways:

- derive the badge from YAML metadata,
- or store a publish-time flag alongside the resume document.

For maintainability, YAML metadata is the cleaner long-term direction if public rendering needs this signal.

## Phase split

### Phase 1: Demo generation

- English-only fictional full-document generation,
- provider integration with Gemini,
- structured JSON output,
- monthly quota,
- editor badge,
- revision note,
- no job description tailoring.

### Phase 2: Job-tailored fictional CV

- add optional job description input,
- keep output fictional but more targeted,
- add a second generation type in usage logs,
- reuse the same quota framework,
- tune prompts for role alignment and ATS-style clarity.

## Suggested implementation order

1. Add provider config and environment variable handling.
2. Add generation usage migration and server helpers.
3. Implement the new API route with quota checks.
4. Add prompt builder and schema validator helpers.
5. Add editor UI and loading/error states.
6. Add AI badge rendering in preview.
7. Add tests for quota, validation, and happy path.
8. Run `npm run verify`.

## Environment variables

Add:

- `GEMINI_API_KEY`

Optional later:

- `AI_RESUME_MODEL`
- `AI_RESUME_PROVIDER`

## Testing plan

Add tests for:

- unauthorized request rejection,
- quota exhausted response,
- valid model response normalization,
- invalid model response rejection,
- editor button disabled state,
- AI badge visibility,
- change note behavior after generation.

Manual QA:

- generate a demo CV from an empty editor,
- confirm YAML panel sync,
- save draft and restore draft,
- publish generated draft,
- verify revision note,
- verify second attempt inside 30 days is blocked.

## Delivery estimate

Estimated implementation time for phase 1:

- development: `1.5 to 2.5 working days`,
- testing and polish: `0.5 to 1 working day`,
- total: `2 to 3.5 working days`.

More conservative estimate if public badge support also requires YAML contract changes:

- `3 to 4.5 working days`.

## Recommendation summary

Build phase 1 with:

- `Gemini 3.1 Flash-Lite Preview`,
- JSON Schema constrained output,
- server-side monthly quota table,
- editor-only AI badge at first,
- manual publish only,
- phase 2 reserved for job-description-tailored generation.
