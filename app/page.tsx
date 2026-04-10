export default function HomePage() {
  return (
    <section className="card">
      <h1>ResumeStudio Rebuild</h1>
      <p>
        Platform foundation and auth core are active. The app runs on Next.js with TypeScript, CI gates, and
        Supabase-based authentication with RBAC.
      </p>
      <ul>
        <li>Next.js App Router scaffold</li>
        <li>Sign in, sign up, reset password, and verification workflows</li>
        <li>Admin panel for role assignment, account status, and deletion constraints</li>
        <li>Legacy URL compatibility redirects</li>
      </ul>
    </section>
  );
}
