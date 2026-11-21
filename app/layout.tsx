import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import localFont from "next/font/local";
import { cookies, headers } from "next/headers";
import AppBrand from "./components/app-brand";
import AppFooter from "./components/app-footer";
import AppThemeScript from "./components/app-theme-script";
import RouteTransition from "./components/route-transition";
import AppHeaderNavigation from "./components/app-header-navigation";
import AppLanguageMenu from "./components/app-language-menu";
import AppThemeSwitch from "./components/app-theme-switch";
import AccountMenu from "./components/account-menu";
import { AppI18nProvider } from "./components/app-i18n-provider";
import { getRequestAppI18n } from "./i18n/server";
import { getAppBaseUrl } from "./lib/env";
import { getCurrentActor } from "./lib/auth-server";
import { getAccessRestriction } from "./lib/access-restriction";
import { isAdminRole } from "./lib/rbac";
import { APP_THEME_COOKIE_NAME, readStoredAppTheme } from "./lib/app-theme";
import { safeJsonLdScript } from "./lib/jsonld";
import { buildOrganizationJsonLd, buildWebSiteJsonLd } from "./lib/jsonld-schemas";
import "./globals.css";
import "./components/design-system/tokens.css";
import "./components/design-system/primitives.css";
import "./components/app-shell.css";

// Two faces split by unicode-range so a page downloads only the subset it renders.
// Only the second carries next/font's metric-adjusted fallback: a fallback after the
// first would catch Polish glyphs before the latin-ext face could.
const fraunces = localFont({
  src: "../public/fonts/Fraunces-Latin.woff2",
  weight: "100 900",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
  variable: "--font-fraunces",
});

const frauncesExt = localFont({
  src: "../public/fonts/Fraunces-LatinExt.woff2",
  weight: "100 900",
  display: "swap",
  preload: false,
  adjustFontFallback: "Times New Roman",
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF",
    },
  ],
  variable: "--font-fraunces-ext",
});

export async function generateMetadata(): Promise<Metadata> {
  const { dictionary } = await getRequestAppI18n();
  return {
    metadataBase: new URL(getAppBaseUrl()),
    title: { default: "OpenCiVera", template: "%s | OpenCiVera" },
    description: dictionary.meta.description,
    icons: {
      icon: "/favicon.svg",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const baseUrl = getAppBaseUrl();
  const cookieStore = await cookies();
  const appI18n = await getRequestAppI18n();
  // No stored choice: render no data-app-theme and let AppThemeScript take it from the system (ADR 0012, #289).
  const initialTheme = readStoredAppTheme(cookieStore.get(APP_THEME_COOKIE_NAME)?.value);
  const cspNonce = (await headers()).get("content-security-policy")?.match(/'nonce-([^']+)'/)?.[1];
  const actor = await getCurrentActor();
  const isAdmin = actor ? isAdminRole(actor.role) : false;
  const restriction = actor ? { restricted: false, reason: "" } : await getAccessRestriction();
  const navItems = actor
    ? [
        ...(isAdmin ? [{ href: "/user", label: appI18n.dictionary.navigation.personal_hub }] : []),
        { href: "/dashboard", label: appI18n.dictionary.navigation.dashboard },
        { href: "/resume", label: appI18n.dictionary.navigation.sample_cv },
        { href: "/docs", label: appI18n.dictionary.navigation.docs },
      ]
    : [
        {
          href: "/login?mode=signin",
          label: appI18n.dictionary.navigation.sign_in,
          emphasis: "secondary" as const,
          disabled: restriction.restricted,
          disabledReason: restriction.reason,
        },
        {
          href: "/login?mode=signup",
          label: appI18n.dictionary.navigation.sign_up,
          emphasis: "primary" as const,
          disabled: restriction.restricted,
          disabledReason: restriction.reason,
        },
      ];

  return (
    <html
      lang={appI18n.locale}
      data-app-theme={initialTheme ?? undefined}
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${fraunces.variable} ${frauncesExt.variable}`}
    >
      <body data-app-theme={initialTheme ?? undefined} suppressHydrationWarning>
        {initialTheme ? null : <AppThemeScript nonce={cspNonce} />}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLdScript(buildOrganizationJsonLd(baseUrl, appI18n.dictionary.meta.description)),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLdScript(buildWebSiteJsonLd(baseUrl, appI18n.dictionary.meta.description, appI18n.locale)),
          }}
        />
        <AppI18nProvider value={appI18n}>
          <a className="ocv-skip" href="#main-content">
            {appI18n.dictionary.common.skip_to_content}
          </a>
          <header className="app-header ocv-topbar">
            <div className="ocv-topbar__inner">
              <AppBrand />
              <AppHeaderNavigation
                items={navItems}
                language={<AppLanguageMenu />}
                theme={<AppThemeSwitch initialTheme={initialTheme} />}
                account={
                  actor ? (
                    <AccountMenu
                      email={actor.email}
                      displayName={actor.displayName}
                      firstName={actor.firstName}
                      lastName={actor.lastName}
                      avatarUrl={actor.avatarUrl}
                      role={actor.role}
                      isActive={actor.isActive}
                      emailConfirmed={actor.emailConfirmed}
                    />
                  ) : null
                }
                forceInlineItems={!actor}
              />
            </div>
          </header>
          <main id="main-content" tabIndex={-1} className="app-shell app-main">
            <RouteTransition>{children}</RouteTransition>
          </main>
          <AppFooter />
        </AppI18nProvider>
      </body>
    </html>
  );
}
