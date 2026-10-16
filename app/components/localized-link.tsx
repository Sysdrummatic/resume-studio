"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { withLangParam } from "../i18n/locale";
import { useOptionalAppI18n } from "./app-i18n-provider";

type LocalizedLinkProps = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

export default function LocalizedLink({ href, ...props }: LocalizedLinkProps) {
  const locale = useOptionalAppI18n()?.locale;
  return <Link href={withLangParam(href, locale)} {...props} />;
}
