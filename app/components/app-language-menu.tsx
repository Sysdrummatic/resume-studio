"use client";

export default function AppLanguageMenu() {
  return (
    <details className="app-language-menu">
      <summary aria-label="Application language">English</summary>
      <div className="app-language-menu__panel">
        <button type="button" className="app-language-menu__option app-language-menu__option--active" aria-current="true">
          English
        </button>
      </div>
    </details>
  );
}
