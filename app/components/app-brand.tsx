import Link from "next/link";
import type { ReactNode } from "react";

const defaultLogo = (
  <svg width="56" height="56" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(40, 40)">
      <polygon points="0,-20 17.32,-10 17.32,10 0,20 -17.32,10 -17.32,-10" fill="url(#ocv-brand-grad)" opacity="0.15" />
      <polygon points="0,-20 17.32,-10 17.32,10 0,20 -17.32,10 -17.32,-10" stroke="url(#ocv-brand-grad)" strokeWidth="2.5" fill="none" />
      <circle cx="0" cy="0" r="8" stroke="#5E6AD2" strokeWidth="2" fill="none" />
      <circle cx="0" cy="0" r="3.5" fill="#009c8a" />
      <circle cx="0" cy="-15" r="1.8" fill="#6872D9" />
      <circle cx="13" cy="7.5" r="1.8" fill="#6872D9" />
      <circle cx="-13" cy="7.5" r="1.8" fill="#6872D9" />
    </g>
    <defs>
      <linearGradient id="ocv-brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#5E6AD2" />
        <stop offset="50%" stopColor="#6872D9" />
        <stop offset="100%" stopColor="#009c8a" />
      </linearGradient>
    </defs>
  </svg>
);

type Props = {
  href?: string;
  logo?: ReactNode;
  name?: string;
};

export default function AppBrand({ href = "/", logo = defaultLogo, name = "OpenCiVera" }: Props) {
  return (
    <Link className="app-brand" href={href} aria-label={name}>
      {logo ? <span className="app-brand__logo" aria-hidden>{logo}</span> : null}
      <span className="app-brand__name">{name}</span>
    </Link>
  );
}
