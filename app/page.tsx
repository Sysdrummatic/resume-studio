import Link from "next/link";

const PLATFORM_PILLARS = [
  {
    title: "Bezpieczne logowanie i RBAC",
    description: "Rejestracja, weryfikacja email, reset hasła oraz role admin/manager/user/recruiter.",
  },
  {
    title: "Nowy edytor CV",
    description: "Iteracyjnie rozwijany edytor oparty o Next.js z live preview i kontrolą publikacji.",
  },
  {
    title: "Zgodność wsteczna",
    description: "Utrzymane legacy ścieżki oraz migracja bez ryzyka big-bang rewrite.",
  },
] as const;

const QUICK_ACTIONS = [
  { href: "/login", label: "Zaloguj się", helper: "Dostęp do konta i odzyskiwanie hasła" },
  { href: "/dashboard", label: "Przejdź do dashboardu", helper: "Podgląd stanu konta i ról" },
  { href: "/master-resume", label: "Otwórz edytor", helper: "Tworzenie i publikacja CV" },
] as const;

export default function HomePage() {
  return (
    <section className="stack stack--lg">
      <article className="card hero-card">
        <p className="eyebrow">OpenCVHub · Next.js Rebuild</p>
        <h1>Nowoczesna, czytelna platforma do zarządzania CV</h1>
        <p className="card-lead">
          Fundament aplikacji działa produkcyjnie. Priorytetem jest UX oparty o prostą nawigację, szybki onboarding
          i przewidywalne zachowanie interfejsu.
        </p>

        <div className="quick-actions" aria-label="Szybkie akcje">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.href} href={action.href} className="quick-actions__item">
              <span className="quick-actions__label">{action.label}</span>
              <span className="quick-actions__helper">{action.helper}</span>
            </Link>
          ))}
        </div>
      </article>

      <section className="feature-grid" aria-label="Filary platformy">
        {PLATFORM_PILLARS.map((pillar) => (
          <article key={pillar.title} className="card feature-card">
            <h2>{pillar.title}</h2>
            <p>{pillar.description}</p>
          </article>
        ))}
      </section>
    </section>
  );
}
