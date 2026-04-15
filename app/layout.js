import './globals.css';

export const metadata = {
  title: 'OpenCV — CV jako otwarty standard',
  description: 'Twórz profesjonalne CV w formacie YAML. Kreator z podglądem na żywo, eksportem i zarządzaniem rolami.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
