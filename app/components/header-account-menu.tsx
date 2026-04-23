"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";

type Props = {
  actor: ReactNode;
};

export default function HeaderAccountMenu({ actor }: Props) {
  const pathname = usePathname();

  if (!actor || pathname === "/") {
    return null;
  }

  return actor;
}
