import type { ReactNode } from "react";
import "../../../app/components/design-system/tokens.css";
import "../../../app/components/design-system/primitives.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl" data-app-theme="dark">
      <body data-app-theme="dark">{children}</body>
    </html>
  );
}
