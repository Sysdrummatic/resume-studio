"use client";

import Link from "next/link";
import { useId, type ReactNode } from "react";

function BrandLogo() {
  const gradientId = useId();
  return (
    <svg width="56" height="56" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(40, 40)">
        <polygon points="0,-20 17.32,-10 17.32,10 0,20 -17.32,10 -17.32,-10" fill={`url(#${gradientId})`} opacity="0.15" />
        <polygon points="0,-20 17.32,-10 17.32,10 0,20 -17.32,10 -17.32,-10" stroke={`url(#${gradientId})`} strokeWidth="2.5" fill="none" />
        <circle cx="0" cy="0" r="8" stroke="#5E6AD2" strokeWidth="2" fill="none" />
        <circle cx="0" cy="0" r="3.5" fill="#009c8a" />
        <circle cx="0" cy="-15" r="1.8" fill="#6872D9" />
        <circle cx="13" cy="7.5" r="1.8" fill="#6872D9" />
        <circle cx="-13" cy="7.5" r="1.8" fill="#6872D9" />
      </g>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5E6AD2" />
          <stop offset="50%" stopColor="#6872D9" />
          <stop offset="100%" stopColor="#009c8a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

type Props = {
  href?: string | null;
  logo?: ReactNode;
  name?: string;
};

export default function AppBrand({ href = "/", logo = <BrandLogo />, name = "OpenCiVera" }: Props) {
  const content = (
    <>
      {logo ? <span className="app-brand__logo" aria-hidden>{logo}</span> : null}
      <span className="app-brand__name">{name}</span>
    </>
  );
  return href === null ? (
    <div className="app-brand" aria-label={name}>{content}</div>
  ) : (
    <Link className="app-brand" href={href} aria-label={name}>{content}</Link>
  );
}
