"use client";
/// <reference types="react/canary" />

import { ViewTransition, type ReactNode } from "react";
import { usePathname } from "next/navigation";

// Layouts persist across navigations, so the route content is keyed by path: a new
// path exits and enters inside the navigation transition (app-shell.css animates
// .ocv-route). Browsers without View Transitions swap the content instantly.
export default function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <ViewTransition key={pathname} enter="ocv-route" exit="ocv-route" default="none">
      {children}
    </ViewTransition>
  );
}
