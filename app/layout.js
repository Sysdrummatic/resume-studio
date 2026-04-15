import './globals.css';

export const metadata = {
  title: 'CV Manager - Zarządzaj swoim CV',
  description: 'Profesjonalne narzędzie do tworzenia i zarządzania CV',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
