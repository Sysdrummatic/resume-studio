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
                {!actor && <Link href="/login">Login</Link>}
                <Link href="/dashboard">Dashboard</Link>
                <Link href="/master-resume">Editor</Link>
                <Link href="/resume">Sample CV</Link>
              </nav>
              <HeaderAccountMenu
                actor={
                  actor ? (
                    <AccountMenu
                      email={actor.email}
                      role={actor.role}
                      isActive={actor.isActive}
                      emailConfirmed={actor.emailConfirmed}
                    />
                  ) : null
                }
              />
            </div>
          </div>
        </header>
        <main className="app-shell app-main">{children}</main>
      </body>
    </html>
  );
}
