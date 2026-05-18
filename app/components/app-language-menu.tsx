"use client";

export default function AppLanguageMenu() {
  return (
    <details className="app-language-menu">
      <summary aria-label="Application language">
        <span className="app-language-menu__label">EN</span>
        <span className="app-language-menu__value">English</span>
        <span className="app-language-menu__chevron" aria-hidden="true">
          <svg viewBox="0 0 12 12" focusable="false">
            <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>
      <div className="app-language-menu__panel">
        <button type="button" className="app-language-menu__option app-language-menu__option--active" aria-current="true">
          English
        </button>
      </div>
    </details>
  );
}
