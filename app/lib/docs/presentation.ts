import type { DocNavGroup } from "./content";

export type DocsLanguage = "en" | "pl";
export const FIRST_CV_GUIDE = "/docs/tutorials/publishing-your-first-cv";

export function resolveDocsLanguage(value: string | string[] | undefined): DocsLanguage {
  return value === "pl" ? "pl" : "en";
}

export function docsHref(href: string, language: DocsLanguage): string {
  const [pathname, hash] = href.split("#");
  return `${pathname}${language === "pl" ? "?lang=pl" : ""}${hash ? `#${hash}` : ""}`;
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .toLowerCase()
    .trim();
}

export function filterDocs<T extends { title: string; description?: string }>(
  items: T[],
  query: string
): T[] {
  const search = normalizeSearch(query);
  return items.filter((item) =>
    normalizeSearch(`${item.title} ${item.description || ""}`).includes(search)
  );
}

export const docsCopy = {
  en: {
    title: "Docs",
    home: "Home",
    helpCenter: "Help center",
    overview: "Overview",
    topics: "Working with your CV",
    tutorials: "Tutorials",
    "test-scenarios": "Test scenarios",
    menu: "Docs menu",
    close: "Close menu",
    outline: "On this page",
    development: "Documentation in progress",
    developmentNote: "Guides evolve with the application.",
    heading: "How can we help?",
    lead: "From your first Master Resume entry to a CV you can share.",
    search: "Search documentation",
    placeholder: "Find a topic or guide…",
    results: "Results",
    clear: "Clear search",
    noResults: "No topics found. Try CV, publishing or language.",
    start: "Start here",
    firstCv: "Your first CV. From editing to publishing.",
    firstCvNote:
      "Build your Master Resume, select the right content and share a finished version. We’ll walk you through each stage.",
    openGuide: "Read the guide",
    tools: "Get to know your tools",
    choose: "Choose what you want to learn",
    guides: "Guides and answers",
    privacyTag: "Your data, your choice",
    privacyTitle: "Your Master Resume is private",
    privacyNote:
      "Only the content selected for your published CV is shared. Everything else stays in your account.",
    privacyLink: "Learn how publishing works",
    about: "About this documentation",
    noDocs: "No guides are available yet.",
    language: "Documentation interface language",
    articleLanguage: "Article language: English",
    footer: "Product documentation",
    master: "Master Resume",
    version: "CV version",
    published: "Published CV",
    masterNote: "Your private experience library",
    versionNote: "Content selected for a specific role",
    publishedNote: "Your selected version, ready to share"
  },
  pl: {
    title: "Dokumentacja",
    home: "Strona główna",
    helpCenter: "Centrum pomocy",
    overview: "Przegląd",
    topics: "Praca z CV",
    tutorials: "Poradniki",
    "test-scenarios": "Scenariusze testowe",
    menu: "Menu dokumentacji",
    close: "Zamknij menu",
    outline: "Na tej stronie",
    development: "Dokumentacja w rozwoju",
    developmentNote: "Poradniki aktualizujemy wraz z aplikacją.",
    heading: "Jak możemy Ci pomóc?",
    lead: "Od pierwszego wpisu w Master Resume do CV, które możesz udostępnić.",
    search: "Szukaj w dokumentacji",
    placeholder: "Znajdź temat lub poradnik…",
    results: "Wyniki",
    clear: "Wyczyść wyszukiwanie",
    noResults: "Nie znaleziono tematu. Spróbuj CV, publikacja lub język.",
    start: "Na dobry początek",
    firstCv: "Twoje pierwsze CV. Od edycji do publikacji.",
    firstCvNote:
      "Zbuduj Master Resume, wybierz potrzebne treści i udostępnij gotową wersję. Przeprowadzimy Cię przez każdy etap.",
    openGuide: "Czytaj poradnik",
    tools: "Poznaj swoje narzędzia",
    choose: "Wybierz obszar, który Cię interesuje",
    guides: "Poradniki i odpowiedzi",
    privacyTag: "Twoje dane, Twój wybór",
    privacyTitle: "Master Resume jest prywatne",
    privacyNote:
      "Udostępniasz tylko treści wybrane do opublikowanej wersji CV. Reszta pozostaje na Twoim koncie.",
    privacyLink: "Poznaj zasady publikacji",
    about: "O dokumentacji",
    noDocs: "Nie ma jeszcze dostępnych poradników.",
    language: "Język interfejsu dokumentacji",
    articleLanguage: "Język artykułu: angielski",
    footer: "Dokumentacja produktu",
    master: "Master Resume",
    version: "Wersja CV",
    published: "Opublikowane CV",
    masterNote: "Prywatna baza Twojego doświadczenia",
    versionNote: "Treści wybrane pod konkretną rolę",
    publishedNote: "Wybrana wersja dostępna pod linkiem"
  }
} as const;

const topicContent = {
  en: [
    {
      title: "Master Resume",
      description: "Add experience, skills and language versions.",
      label: "Creating & editing"
    },
    {
      title: "CV versions",
      description: "Choose the information that fits a particular role.",
      label: "Selecting content"
    },
    {
      title: "Publishing & sharing",
      description: "Review your CV and share it with a public link.",
      label: "Links & visibility"
    }
  ],
  pl: [
    {
      title: "Master Resume",
      description: "Dodaj doświadczenie, umiejętności i wersje językowe.",
      label: "Tworzenie i edycja"
    },
    {
      title: "Wersje CV",
      description: "Wybierz informacje, które pasują do konkretnej oferty.",
      label: "Wybór treści"
    },
    {
      title: "Publikacja i udostępnianie",
      description: "Sprawdź CV i udostępnij je za pomocą publicznego linku.",
      label: "Linki i widoczność"
    }
  ]
};
const topicAnchors = [
  "1-edit-your-master-resume",
  "2-create-a-cv-version",
  "3-publish-the-cv-version"
];

export function buildDocsTopics(groups: DocNavGroup[], language: DocsLanguage) {
  if (!groups.some((group) => group.items.some((item) => item.href === FIRST_CV_GUIDE))) return [];
  return topicContent[language].map((topic, index) => ({
    ...topic,
    href: docsHref(`${FIRST_CV_GUIDE}#${topicAnchors[index]}`, language)
  }));
}
