import { createRoot } from "react-dom/client";
import yaml from "js-yaml";
import "../../app/globals.css";
import DashboardClient from "../../app/dashboard/dashboard-client";
import WorkspaceBreadcrumbs from "../../app/components/workspace-breadcrumbs";
import EditorCanvasClient from "../../app/master-resume/editor-canvas-client";
import { SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";

window.jsyaml = yaml;
const content = (locale: string) => ({
  first_name: "Ada",
  family_name: "Example",
  brand_initials: "AE",
  contact: [{ label: "Email", value: "ada@example.com" }],
  summary: [
    {
      position: locale === "pl" ? "Projektantka" : "Designer",
      description: "Selected profile",
      default: true
    },
    { position: "Private role", description: "UNSELECTED SUMMARY" }
  ],
  experience: [
    {
      company: "Example Studio",
      role: "Designer",
      period: "2020–2026",
      highlights: ["Selected experience"]
    },
    { company: "PRIVATE COMPANY", role: "Hidden", highlights: ["UNSELECTED EXPERIENCE"] }
  ],
  skills: [
    { name: "Research", level: 4 },
    { name: "PRIVATE SKILL", level: 3 }
  ],
  courses: [{ name: "Accessibility", year: 2025 }]
});
const documents = ["en", "pl"].map((locale) => ({
  id: `document-${locale}`,
  user_id: "owner",
  locale,
  title: "Master Resume",
  yaml_content: yaml.dump(content(locale)),
  updated_at: "2026-09-08T12:00:00Z",
  schema_version: 1,
  style_settings: {
    textSize: "large",
    density: "compact",
    sectionDividers: false,
    headerPhoto: false,
    liveLinkQr: false
  }
}));
const selection = {
  summary: [0],
  experience: [0],
  education: [],
  courses: [],
  skills: [0],
  interests: [],
  languages: [],
  tech_stack: []
};
const presets = [
  {
    id: "public",
    title: "Published designer",
    is_public: true,
    canonical_public_path: "/ada-example/public-cv"
  },
  { id: "private", title: "Private designer", is_public: false, canonical_public_path: null },
  {
    id: "test",
    title: "Onboarding test",
    is_public: false,
    canonical_public_path: null,
    onboarding_test_run_id: "isolated-test"
  }
].map((row) => ({
  ...row,
  user_id: "owner",
  document_id: "document-en",
  selection,
  allow_indexing: false,
  ai_generated: false,
  default_locale: "en",
  slug: null,
  published_at: row.is_public ? "2026-09-08T12:00:00Z" : null,
  created_at: "2026-09-08T12:00:00Z",
  updated_at: "2026-09-08T12:00:00Z"
}));
const query = new URLSearchParams(location.search);
const languageRows = documents.map((doc) => ({
  user_id: "owner",
  code: doc.locale,
  label: doc.locale === "pl" ? "Polski" : "English",
  short_label: doc.locale.toUpperCase(),
  is_default: doc.locale === "en",
  labels: {},
  sort_order: 0,
  created_at: doc.updated_at,
  updated_at: doc.updated_at,
  label_override: null,
  short_label_override: null
}));
Object.assign(window, { dashboardFixture: { documents, presets, languageRows } });
createRoot(document.getElementById("root")!).render(
  <SearchParamsContext.Provider value={query}>
    <header className="app-header">
      <div className="app-shell app-header__inner">
        <a href="/">OpenCiVera</a>
        <nav>
          <a href="/dashboard">Dashboard</a> <a href="/master-resume">Master Resume</a>
        </nav>
      </div>
    </header>
    <main className="app-main">
      {query.has("editor") ? (
        <EditorCanvasClient draftPdfEnabled={false} />
      ) : (
        <div className="dashboard-page editor-theme wide-shell-page">
          <WorkspaceBreadcrumbs current="Dashboard" />
          <DashboardClient
            masterResume={query.has("empty") ? null : documents[0]}
            initialDocuments={query.has("empty") ? [] : documents}
            initialPresets={query.has("empty") ? [] : presets}
            languageOptions={languageRows}
            draftPdfEnabled={query.has("admin")}
            dataTransferEnabled={!query.has("restricted")}
          />
        </div>
      )}
    </main>
  </SearchParamsContext.Provider>
);
