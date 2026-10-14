"use client";

import Link from "next/link";
import { useAppI18n } from "./components/app-i18n-provider";

export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { dictionary } = useAppI18n();
  const { errors } = dictionary;

  return (
    <section className="card stack" role="alert" aria-labelledby="route-error-title">
      <p className="product-surface__eyebrow">{errors.server.eyebrow}</p>
      <h1 id="route-error-title">{errors.server.title}</h1>
      <p>{errors.server.description}</p>
      <p>
        <button type="button" className="button button--primary" onClick={reset}>
          {errors.server.retry}
        </button>{" "}
        <Link href="/" className="button button--ghost">
          {errors.home}
        </Link>
      </p>
    </section>
  );
}
