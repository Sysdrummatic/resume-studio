type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

type SendEmailResult = { sent: true } | { sent: false; reason: "not_configured" | "send_failed" };

const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<SendEmailResult> {
  const resendApiKey = process.env.RESEND_API_KEY || null;
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || null;

  if (!resendApiKey) {
    console.warn("[email] RESEND_API_KEY not configured — skipping email send", { to, subject });
    return { sent: false, reason: "not_configured" };
  }

  if (!fromAddress) {
    console.warn("[email] EMAIL_FROM_ADDRESS not configured — skipping email send", { to, subject });
    return { sent: false, reason: "not_configured" };
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: fromAddress, to, subject, html }),
    });

    if (!response.ok) {
      console.error("[email] Resend request failed", { to, subject, status: response.status });
      return { sent: false, reason: "send_failed" };
    }

    return { sent: true };
  } catch (err) {
    console.error("[email] Resend request errored", { to, subject, err });
    return { sent: false, reason: "send_failed" };
  }
}
