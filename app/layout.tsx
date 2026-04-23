import type { Metadata } from "next";
import Link from "next/link";
import AccountMenu from "./components/account-menu";
import HeaderAccountMenu from "./components/header-account-menu";
import { getCurrentActor } from "./lib/auth-server";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenCVHub",
  description: "OpenCVHub platform foundation on Next.js"
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const actor = await getCurrentActor();

  return (
    <html lang="en">
      <body>
        <header className="app-header">
          <div className="app-shell app-header__inner">
            <Link className="app-brand" href="/">
              OpenCVHub
            </Link>
            <div className="app-header__controls">
              <nav className="app-nav" aria-label="Primary">
                {actor && <Link href="/dashboard">Dashboard</Link>}
                {actor && <Link href="/master-resume">Editor</Link>}
                <Link href="/resume">Sample CV</Link>
              </nav>
              {actor ? (
                <HeaderAccountMenu actor={<AccountMenu email={actor.email} role={actor.role} />} />
              ) : (
                <Link className="login-menu-trigger" href="/login" aria-label="Go to login">
                  <span className="login-menu-trigger__avatar" aria-hidden>
                    L
                  </span>
                  <span className="login-menu-trigger__label">Login</span>
                </Link>
              )}
            </div>
          </div>
        </header>
        <main className="app-shell app-main">{children}</main>
      </body>
    </html>
  );
}
