import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  href?: string;
  logo?: ReactNode;
  name?: string;
};

export default function AppBrand({ href = "/", logo = null, name = "OpenCVHub" }: Props) {
  return (
    <Link className="app-brand" href={href} aria-label={name}>
      {logo ? <span className="app-brand__logo" aria-hidden>{logo}</span> : null}
      <span className="app-brand__name">{name}</span>
    </Link>
  );
}
