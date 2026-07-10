import { Typography } from "../components/design-system/atoms/Typography";

export const metadata = {
  title: "Privacy Policy | OpenCiVera",
  description: "How OpenCiVera collects, uses, and protects your account and CV data.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="container py-8">
      <article className="card stack" style={{ maxWidth: "65ch", marginInline: "auto" }}>
        <Typography variant="h1">Privacy Policy</Typography>
        <Typography variant="body" muted>Last updated: 2026-07-09</Typography>

        <Typography variant="h2">1. Who We Are</Typography>
        <Typography variant="body">
          OpenCiVera (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is operated by Łukasz Michta. For any
          questions about this policy or your personal data, contact us at opencvproject@proton.me.
        </Typography>

        <Typography variant="h2">2. What Data We Collect</Typography>
        <ul>
          <li>
            <Typography as="span" variant="body">
              Account data: email address, encrypted password (managed by our authentication
              provider), display name, profile photo (optional), account role.
            </Typography>
          </li>
          <li>
            <Typography as="span" variant="body">
              CV content: any information you choose to add to your CV documents, which may
              include your name, job title, professional summary, contact details (email,
              phone, location, LinkedIn, website), skills, technologies, languages, work
              experience, education, and courses or certifications.
            </Typography>
          </li>
          <li>
            <Typography as="span" variant="body">
              Published CV data: snapshots of CV versions you choose to publish, and metadata
              about the public links you create (status, selected languages, visibility
              settings).
            </Typography>
          </li>
          <li>
            <Typography as="span" variant="body">
              Usage data: aggregated view counts for your published CV links, and
              administrative audit logs used for security purposes (account actions with
              timestamps).
            </Typography>
          </li>
        </ul>

        <Typography variant="h2">3. Why We Process Your Data</Typography>
        <ul>
          <li>
            <Typography as="span" variant="body">
              To create and operate your account and provide the CV-management and publishing
              service. Legal basis: performance of a contract (GDPR Art. 6(1)(b)).
            </Typography>
          </li>
          <li>
            <Typography as="span" variant="body">
              To generate and host public CV links at your request. Legal basis: performance
              of a contract.
            </Typography>
          </li>
          <li>
            <Typography as="span" variant="body">
              To maintain security, prevent abuse, and keep administrative audit logs. Legal
              basis: legitimate interest (GDPR Art. 6(1)(f)).
            </Typography>
          </li>
          <li>
            <Typography as="span" variant="body">
              We do not use your data for advertising and we do not sell your data.
            </Typography>
          </li>
        </ul>

        <Typography variant="h2">4. Who We Share Your Data With</Typography>
        <Typography variant="body">
          We use the following service providers (processors) to operate OpenCiVera:
        </Typography>
        <ul>
          <li>
            <Typography as="span" variant="body">
              Supabase, for our database, authentication, and file storage, hosted in the
              European Union (Frankfurt).
            </Typography>
          </li>
          <li>
            <Typography as="span" variant="body">
              Netlify, Inc., for application hosting. Netlify is based in the United States;
              Netlify&apos;s standard Data Processing Agreement and Standard Contractual Clauses
              apply to any transfer of personal data outside the European Economic Area.
            </Typography>
          </li>
          <li>
            <Typography as="span" variant="body">
              Resend, for transactional emails (such as account-deletion confirmation and
              authentication emails). Resend is based in the United States; Resend&apos;s
              standard Data Processing Agreement and Standard Contractual Clauses apply to any
              transfer of personal data outside the European Economic Area.
            </Typography>
          </li>
        </ul>
        <Typography variant="body">
          We do not share your CV content with any other third party unless you choose to
          make it publicly available via a Public Link that you create.
        </Typography>
        <Typography variant="body">
          OpenCiVera is currently an MVP (Minimum Viable Product) in a testing phase. We are
          not responsible for changes that Supabase or Netlify make to their own privacy
          policies, terms, or data-handling practices; please refer to their respective
          policies for the most current information.
        </Typography>

        <Typography variant="h2">5. Data Retention</Typography>
        <ul>
          <li>
            <Typography as="span" variant="body">
              While your account is active, we retain your account and CV data for as long as
              you keep your account.
            </Typography>
          </li>
          <li>
            <Typography as="span" variant="body">
              If you delete your account yourself using the &quot;Delete account and all
              data&quot; option in your account settings, your personal data is deleted
              immediately.
            </Typography>
          </li>
          <li>
            <Typography as="span" variant="body">
              If you request deletion through other means (for example, because you can no
              longer access your account), we will delete your personal data within 30 days
              of confirming the request, except where retention is required by law or for
              legitimate security purposes (such as administrative audit logs).
            </Typography>
          </li>
          <li>
            <Typography as="span" variant="body">
              Aggregated, non-identifying analytics (such as link view counts) may be retained
              longer for product improvement, in line with our internal data retention policy.
            </Typography>
          </li>
        </ul>

        <Typography variant="h2">6. Your Rights</Typography>
        <Typography variant="body">Under the GDPR, you have the right to:</Typography>
        <ul>
          <li><Typography as="span" variant="body">Access the personal data we hold about you.</Typography></li>
          <li><Typography as="span" variant="body">Request correction of inaccurate data.</Typography></li>
          <li><Typography as="span" variant="body">Request erasure of your data (&quot;right to be forgotten&quot;).</Typography></li>
          <li><Typography as="span" variant="body">Request restriction of processing.</Typography></li>
          <li><Typography as="span" variant="body">Receive a copy of your data in a portable format.</Typography></li>
          <li><Typography as="span" variant="body">Object to processing based on legitimate interest.</Typography></li>
          <li>
            <Typography as="span" variant="body">
              Lodge a complaint with your local data protection authority. In Poland, this is
              the President of the Personal Data Protection Office (UODO).
            </Typography>
          </li>
        </ul>
        <Typography variant="body">
          To exercise any of these rights, contact us at opencvproject@proton.me. We will
          respond within one month, as required by law.
        </Typography>

        <Typography variant="h2">7. Cookies</Typography>
        <Typography variant="body">
          We use only cookies that are strictly necessary for authentication, to keep you
          signed in. We do not use third-party advertising or analytics cookies that require
          consent.
        </Typography>

        <Typography variant="h2">8. International Data Transfers</Typography>
        <Typography variant="body">
          Your account and CV data are stored within the European Economic Area (EU,
          Frankfurt). Where a service provider is located outside the EEA, appropriate
          safeguards (such as Standard Contractual Clauses) are in place.
        </Typography>

        <Typography variant="h2">9. Children</Typography>
        <Typography variant="body">
          OpenCiVera is not directed at individuals under the age of 16, and we do not
          knowingly collect personal data from children.
        </Typography>

        <Typography variant="h2">10. Changes to This Policy</Typography>
        <Typography variant="body">
          We may update this policy from time to time. The &quot;Last updated&quot; date at
          the top reflects the most recent revision. Material changes will be communicated via
          email or an in-app notice.
        </Typography>

        <Typography variant="h2">11. Contact</Typography>
        <Typography variant="body">
          For privacy-related questions or requests, contact: opencvproject@proton.me
        </Typography>
      </article>
    </main>
  );
}
