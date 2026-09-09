import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function WorkspaceBreadcrumbs({
  current
}: {
  current: "Dashboard" | "Master Resume";
}) {
  return (
    <nav className="workspace-breadcrumbs" aria-label="Breadcrumb">
      <ol>
        <li>
          <Link href="/">Home</Link>
        </li>
        <li>
          <ChevronRight size={13} aria-hidden="true" />
          {current === "Dashboard" ? (
            <span aria-current="page">Dashboard</span>
          ) : (
            <Link href="/dashboard">Dashboard</Link>
          )}
        </li>
        {current === "Master Resume" ? (
          <li>
            <ChevronRight size={13} aria-hidden="true" />
            <span aria-current="page">Master Resume</span>
          </li>
        ) : null}
      </ol>
    </nav>
  );
}
