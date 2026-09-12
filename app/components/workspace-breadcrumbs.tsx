import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function WorkspaceBreadcrumbs({
  current,
  parents = current === "Dashboard"
    ? [{ label: "Home", href: "/" }]
    : [{ label: "Home", href: "/" }, { label: "Dashboard", href: "/dashboard" }],
}: {
  current: string;
  parents?: ReadonlyArray<{ label: string; href?: string }>;
}) {
  return (
    <nav className="workspace-breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {parents.map((parent, index) => (
          <li key={`${parent.label}-${index}`}>
            {index > 0 ? <ChevronRight size={13} aria-hidden="true" /> : null}
            {parent.href ? <Link href={parent.href}>{parent.label}</Link> : <span>{parent.label}</span>}
          </li>
        ))}
        <li>
          {parents.length > 0 ? <ChevronRight size={13} aria-hidden="true" /> : null}
          <span aria-current="page">{current}</span>
        </li>
      </ol>
    </nav>
  );
}
