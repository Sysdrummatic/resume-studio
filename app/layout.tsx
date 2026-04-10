import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResumeStudio",
  description: "ResumeStudio platform foundation on Next.js"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="app-header">
          <div className="app-shell app-header__inner">
            <Link className="app-brand" href="/">
              ResumeStudio
            </Link>
            <nav className="app-nav" aria-label="Primary">
              <Link href="/login">Login</Link>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/master-resume">Editor</Link>
              <Link href="/admin">Admin</Link>
              <Link href="/resume">Sample CV</Link>
            </nav>
          </div>
        </header>
        <main className="app-shell app-main">{children}</main>
      </body>
    </html>
  );
}
