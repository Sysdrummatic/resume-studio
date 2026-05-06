import Link from "next/link";

export type ResumeLanguageOption = {
  code: string;
  label: string;
  shortLabel?: string;
  href?: string;
};

type Props = {
  languages: ResumeLanguageOption[];
  activeLocale: string;
  ariaLabel: string;
  isBusy?: boolean;
  onSelect?: (locale: string) => void;
};

function normalizeLocaleCode(value: string): string {
  return value.trim().toLowerCase();
}

export function getLanguageDisplayLabel(option: ResumeLanguageOption, activeLocale: string, totalLanguages: number): string {
  const isActive = normalizeLocaleCode(option.code) === normalizeLocaleCode(activeLocale);
  if (isActive || totalLanguages <= 2) {
    return option.label;
  }
  return option.shortLabel || option.code.slice(0, 2).toUpperCase();
}

export default function ResumeLanguageSwitcher({ languages, activeLocale, ariaLabel, isBusy = false, onSelect }: Props) {
  if (languages.length === 0) {
    return null;
  }

  return (
    <div className={`language-switcher ${isBusy ? "language-switcher--busy" : ""}`} aria-label={ariaLabel}>
      {languages.map((language) => {
        const isActive = normalizeLocaleCode(language.code) === normalizeLocaleCode(activeLocale);
        const label = getLanguageDisplayLabel(language, activeLocale, languages.length);
        const className = `language-switcher__option ${isActive ? "language-switcher__option--active" : ""}`;

        if (language.href) {
          return (
            <Link key={language.code} className={className} href={language.href} aria-current={isActive ? "true" : undefined}>
              {label}
            </Link>
          );
        }

        return (
          <button
            key={language.code}
            type="button"
            className={className}
            aria-current={isActive ? "true" : undefined}
            disabled={isBusy}
            onClick={() => onSelect?.(language.code)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
