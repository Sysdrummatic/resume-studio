"use client";

import Link from "next/link";

// Replaces the root layout, so there is no i18n provider here: the copy is
// bilingual (PL/EN) and deliberately never shows error details.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pl">
      <head>
        <meta name="robots" content="noindex, nofollow" />
        <title>OpenCiVera</title>
      </head>
      <body>
        <main className="card stack" role="alert">
          <h1>Coś poszło nie tak / Something went wrong</h1>
          <p>
            Nie udało się wczytać aplikacji. Spróbuj ponownie lub wróć na stronę główną.
            <br />
            We could not load the application. Try again, or go back to the home page.
          </p>
          <p>
            <button type="button" className="button button--primary" onClick={reset}>
              Spróbuj ponownie / Try again
            </button>{" "}
            <Link href="/" className="button button--ghost">
              Strona główna / Home
            </Link>
          </p>
        </main>
      </body>
    </html>
  );
}
