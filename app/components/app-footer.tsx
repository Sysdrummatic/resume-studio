"use client";

import { usePathname } from "next/navigation";
import Link from "./localized-link";
import { useAppI18n } from "./app-i18n-provider";

// The landing page keeps its own footer until its redesign stage (#290).
export default function AppFooter() {
  const pathname = usePathname();
  const { dictionary } = useAppI18n();
  const labels = dictionary.footer;

  if (pathname === "/") {
    return null;
  }

  return (
    <footer className="ocv-footer">
      <div className="ocv-footer__inner">
        <span>© 2026 OpenCiVera</span>
        <nav className="ocv-footer__links" aria-label={labels.aria_label}>
          <Link href="/docs">{labels.docs}</Link>
          <Link href="/privacy">{labels.privacy}</Link>
          <Link href="/terms">{labels.terms}</Link>
        </nav>
      </div>
    </footer>
  );
}
