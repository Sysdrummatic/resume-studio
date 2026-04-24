"use client";

import { ReactNode } from "react";

type Props = {
  actor: ReactNode;
};

export default function HeaderAccountMenu({ actor }: Props) {
  if (!actor) {
    return null;
  }

  return actor;
}
