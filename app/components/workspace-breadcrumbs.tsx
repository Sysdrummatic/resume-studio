"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useAppI18n } from "./app-i18n-provider";

export default function WorkspaceBreadcrumbs({
  current,
  parents
}: {
  current: string;
  parents?: ReadonlyArray<{ label: string; href?: string }>;
}) {
  const { dictionary } = useAppI18n();
  const resolvedParents =
    parents ??
    (current === dictionary.dashboard.main.title
      ? [{ label: dictionary.common.home, href: "/" }]
      : [
          { label: dictionary.common.home, href: "/" },
          { label: dictionary.dashboard.main.title, href: "/dashboard" }
        ]);

  return (
    <nav className="workspace-breadcrumbs" aria-label={dictionary.common.breadcrumb}>
      <ol>
        {resolvedParents.map((parent, index) => (
          <li key={`${parent.label}-${index}`}>
            {index > 0 ? <ChevronRight size={13} aria-hidden="true" /> : null}
            {parent.href ? (
              <Link href={parent.href}>{parent.label}</Link>
            ) : (
              <span>{parent.label}</span>
            )}
          </li>
        ))}
        <li>
          {resolvedParents.length > 0 ? <ChevronRight size={13} aria-hidden="true" /> : null}
          <span aria-current="page">{current}</span>
        </li>
      </ol>
    </nav>
  );
}
