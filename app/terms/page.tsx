import { Typography } from "../components/design-system/atoms/Typography";

export const metadata = {
  title: "Terms of Service | OpenCiVera",
  description: "The terms that govern your use of OpenCiVera.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsOfServicePage() {
  return (
    <main className="container py-8">
      <article className="card stack" style={{ maxWidth: "65ch", marginInline: "auto" }}>
        <Typography variant="h1">Terms of Service</Typography>
        <Typography variant="body" muted>Last updated: 2026-07-24</Typography>

        <Typography variant="h2">1. About These Terms</Typography>
        <Typography variant="body">
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of OpenCiVera (the
          &quot;Service&quot;), operated by Łukasz Michta (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;). By creating an
          account or using the Service, you agree to these Terms. If you do not agree, do not use the
          Service.
        </Typography>

        <Typography variant="h2">2. The Service</Typography>
        <Typography variant="body">
          OpenCiVera lets you create, manage, and optionally publish CV/resume content at a stable link
          that you control. Features may be experimental, in development, or may change over time. We
          provide the Service on a best-effort basis and do not guarantee uptime, availability, or that
          any particular feature will remain available.
        </Typography>

        <Typography variant="h2">3. Eligibility and Accounts</Typography>
        <Typography variant="body">
          You must be at least 16 years old to create an account. You are responsible for maintaining
          the confidentiality of your account credentials and for all activity under your account. You
          must provide accurate information when creating your account.
        </Typography>

        <Typography variant="h2">4. Your Content</Typography>
        <Typography variant="body">
          You retain ownership of the content you create or upload to your CV documents (&quot;Your
          Content&quot;). By using the Service, you grant us a limited license to host, store, process, and
          display Your Content as necessary to provide the Service to you.
        </Typography>
        <Typography variant="body">
          If you choose to publish Your Content via a Public Link, you grant us a license to make that
          content publicly accessible at the link you create, for as long as the link remains published.
          You are solely responsible for deciding what to publish, including ensuring you have the right
          to include any third-party information (such as references&apos; contact details) in published
          content.
        </Typography>
        <Typography variant="body">
          You may unpublish or delete Your Content at any time through the features provided in the
          Service.
        </Typography>

        <Typography variant="h2">5. Acceptable Use</Typography>
        <Typography variant="body">You agree not to use the Service to:</Typography>
        <ul>
          <li>
            <Typography as="span" variant="body">
              Upload or publish unlawful, defamatory, or infringing content.
            </Typography>
          </li>
          <li>
            <Typography as="span" variant="body">
              Impersonate any person or entity, or misrepresent your affiliation.
            </Typography>
          </li>
          <li>
            <Typography as="span" variant="body">
              Attempt to gain unauthorized access to other accounts or to the Service&apos;s
              infrastructure.
            </Typography>
          </li>
          <li>
            <Typography as="span" variant="body">
              Use the Service to distribute spam or malware, or to scrape or harvest data from other
              users&apos; public CV pages at scale.
            </Typography>
          </li>
        </ul>
        <Typography variant="body">We may suspend or terminate accounts that violate these Terms.</Typography>

        <Typography variant="h2">6. The OpenCiVera Brand, and the OpenCV Format</Typography>
        <Typography variant="body">
          &quot;OpenCiVera&quot; and associated logos are our trademarks and may not be used without
          permission, except as necessary to refer to the Service (for example, linking to your
          published CV). These Terms govern your use of the OpenCiVera Service only; they do not restrict
          use of the OpenCV data format specification itself, which is documented and published
          separately.
        </Typography>

        <Typography variant="h2">7. Free Use and Future Changes</Typography>
        <Typography variant="body">
          The Service is currently provided free of charge. We may introduce paid plans or features in
          the future. If we do, we will provide reasonable advance notice before any change affects your
          existing account, and continued use of any new paid feature will be optional unless clearly
          stated otherwise.
        </Typography>

        <Typography variant="h2">8. Termination</Typography>
        <Typography variant="body">
          You may stop using the Service and request deletion of your account at any time, as described
          in our Privacy Policy. We may suspend or terminate your access if you violate these Terms, or
          discontinue the Service (or features of it) with reasonable notice where practicable.
        </Typography>

        <Typography variant="h2">9. Disclaimers</Typography>
        <Typography variant="body">
          The Service is provided &quot;as is&quot; and &quot;as available&quot;, without warranties of
          any kind, express or implied, including warranties of merchantability, fitness for a particular
          purpose, or non-infringement. We do not warrant that the Service will be uninterrupted, secure,
          or error-free.
        </Typography>

        <Typography variant="h2">10. Limitation of Liability</Typography>
        <Typography variant="body">
          To the maximum extent permitted by applicable law, Łukasz Michta shall not be liable for any
          indirect, incidental, special, consequential, or punitive damages, or any loss of data, revenue,
          or profits, arising from your use of, or inability to use, the Service. Nothing in these Terms
          excludes or limits liability that cannot be excluded or limited under applicable law.
        </Typography>

        <Typography variant="h2">11. Governing Law</Typography>
        <Typography variant="body">
          These Terms are governed by the laws of Poland. This section does not affect any mandatory
          consumer-protection rights you may have under the laws of your country of residence.
        </Typography>

        <Typography variant="h2">12. Changes to These Terms</Typography>
        <Typography variant="body">
          We may update these Terms from time to time. The &quot;Last updated&quot; date above reflects
          the most recent revision. Material changes will be communicated via email or an in-app notice,
          consistent with how we communicate changes to our Privacy Policy.
        </Typography>

        <Typography variant="h2">13. Contact</Typography>
        <Typography variant="body">
          Questions about these Terms can be sent to support@opencivera.com.
        </Typography>
      </article>
    </main>
  );
}
