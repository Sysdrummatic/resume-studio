import type { Metadata } from "next";
import Link from "next/link";
import { getRequestAppI18n } from "./i18n/server";

export const metadata: Metadata = {
  title: "404 | OpenCiVera",
  robots: { index: false, follow: false },
};

export default async function NotFound() {
  const { dictionary } = await getRequestAppI18n();
  const { errors } = dictionary;

  return (
    <section className="card stack" aria-labelledby="not-found-title">
      <p className="product-surface__eyebrow">{errors.not_found.eyebrow}</p>
      <h1 id="not-found-title">{errors.not_found.title}</h1>
      <p>{errors.not_found.description}</p>
      <p>
        <Link href="/" className="button button--primary">
          {errors.home}
        </Link>{" "}
        <Link href="/docs" className="button button--ghost">
          {errors.docs}
        </Link>
      </p>
    </section>
  );
}
