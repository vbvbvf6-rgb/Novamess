import nodemailer from "nodemailer";
import { logger } from "./logger";

// ── Elastic Email (HTTP API — free 100/day, email-only signup, works from Russia) ─
async function sendViaElasticEmail(opts: {
  from: string;
  fromName: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<boolean> {
  const apiKey = process.env.ELASTICEMAIL_API_KEY;
  if (!apiKey) return false;

  const params = new URLSearchParams({
    apikey: apiKey,
    from: opts.from,
    fromName: opts.fromName,
    to: opts.to,
    subject: opts.subject,
    bodyHtml: opts.html,
    bodyText: opts.text,
    isTransactional: "true",
  });

  const res = await fetch("https://api.elasticemail.com/v2/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const json = await res.json().catch(() => ({})) as any;
  if (!res.ok || !json?.success) {
    logger.error({ status: res.status, error: json?.error }, "Elastic Email API error");
    return false;
  }
  return true;
}

// ── Mailjet (HTTP API — free 200/day, EU, no phone needed, works on Render) ─
async function sendViaMailjet(opts: {
  from: string;
  fromName: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<boolean> {
  const apiKey = process.env.MAILJET_API_KEY;
  const apiSecret = process.env.MAILJET_API_SECRET;
  if (!apiKey || !apiSecret) return false;

  const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

  const res = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      Messages: [
        {
          From: { Email: opts.from, Name: opts.fromName },
          To: [{ Email: opts.to }],
          Subject: opts.subject,
          TextPart: opts.text,
          HTMLPart: opts.html,
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logger.error({ status: res.status, body }, "Mailjet API error");
    return false;
  }
  return true;
}

// ── Brevo (HTTP API — free 300/day, no domain needed, works on Render) ─────
async function sendViaBrevo(opts: {
  from: string;
  fromName: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return false;

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: opts.fromName, email: opts.from },
      to: [{ email: opts.to }],
      subject: opts.subject,
      textContent: opts.text,
      htmlContent: opts.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logger.error({ status: res.status, body }, "Brevo API error");
    return false;
  }
  return true;
}

// ── Resend (HTTP API — works on Render, needs domain for mass sending) ──────
async function sendViaResend(opts: {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: opts.from,
      to: [opts.to],
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logger.error({ status: res.status, body }, "Resend API error");
    return false;
  }
  return true;
}

// ── SMTP fallback (blocked on Render free tier) ────────────────────────────
function createSmtpTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = parseInt(process.env.SMTP_PORT || "465", 10);

  if (smtpHost && smtpUser && smtpPass) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailPass) {
    return nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: gmailUser, pass: gmailPass },
    });
  }

  return null;
}

function getSenderAddress(): string {
  return (
    process.env.MAIL_FROM ||
    process.env.SMTP_USER ||
    process.env.GMAIL_USER ||
    "noreply@nova.app"
  );
}

function getSenderName(): string {
  return process.env.MAIL_FROM_NAME || "Nova";
}

export function isMailerConfigured(): boolean {
  const hasElastic = !!process.env.ELASTICEMAIL_API_KEY;
  const hasMailjet = !!(process.env.MAILJET_API_KEY && process.env.MAILJET_API_SECRET);
  const hasBrevo = !!process.env.BREVO_API_KEY;
  const hasResend = !!process.env.RESEND_API_KEY;
  const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  const hasGmail = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  return hasElastic || hasMailjet || hasBrevo || hasResend || hasSmtp || hasGmail;
}

/** Call once at startup to log mailer status. */
export async function testMailerConnection(): Promise<void> {
  if (process.env.ELASTICEMAIL_API_KEY) {
    console.log(`[mailer] Elastic Email configured — HTTP API, sender: ${getSenderAddress()}`);
    return;
  }
  if (process.env.BREVO_API_KEY) {
    console.log(`[mailer] Brevo configured — HTTP API, sender: ${getSenderAddress()}`);
    return;
  }
  if (process.env.RESEND_API_KEY) {
    console.log(`[mailer] Resend configured — HTTP API, sender: ${getSenderAddress()}`);
    return;
  }

  const t = createSmtpTransporter();
  if (!t) {
    console.warn(
      "[mailer] NOT configured — set ELASTICEMAIL_API_KEY (recommended, no phone needed) " +
      "or BREVO_API_KEY / RESEND_API_KEY / SMTP_HOST+SMTP_USER+SMTP_PASS"
    );
    return;
  }

  const provider = process.env.SMTP_HOST || "smtp.gmail.com";
  const user = getSenderAddress();
  try {
    await t.verify();
    console.log(`[mailer] SMTP connection OK — ${provider} (${user})`);
  } catch (err: any) {
    console.error(
      `[mailer] SMTP connection FAILED: ${err?.message}. Code: ${err?.code}. Response: ${err?.response}`
    );
  }
}

async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<boolean> {
  const from = getSenderAddress();
  const fromName = getSenderName();

  // 1. Elastic Email — HTTP, free 100/day, email-only signup (no phone), works from Russia
  if (process.env.ELASTICEMAIL_API_KEY) {
    try {
      const ok = await sendViaElasticEmail({ from, fromName, ...opts });
      if (ok) {
        logger.info({ to: opts.to }, "Email sent via Elastic Email");
        return true;
      }
    } catch (err: any) {
      logger.error({ errMessage: err?.message }, "Elastic Email send failed");
    }
  }

  // 2. Brevo — HTTP, free 300/day, no domain needed
  if (process.env.BREVO_API_KEY) {
    try {
      const ok = await sendViaBrevo({ from, fromName, ...opts });
      if (ok) {
        logger.info({ to: opts.to }, "Email sent via Brevo");
        return true;
      }
    } catch (err: any) {
      logger.error({ errMessage: err?.message }, "Brevo send failed");
    }
  }

  // 3. Resend — HTTP, needs domain for sending to arbitrary addresses
  if (process.env.RESEND_API_KEY) {
    try {
      const ok = await sendViaResend({ from: `${fromName} <${from}>`, ...opts });
      if (ok) {
        logger.info({ to: opts.to }, "Email sent via Resend");
        return true;
      }
    } catch (err: any) {
      logger.error({ errMessage: err?.message }, "Resend send failed");
    }
  }

  // 4. SMTP fallback (not available on Render free tier)
  const t = createSmtpTransporter();
  if (!t) {
    logger.warn("Mailer not configured — set ELASTICEMAIL_API_KEY or BREVO_API_KEY");
    return false;
  }
  try {
    await t.sendMail({ from: `"${fromName}" <${from}>`, ...opts });
    logger.info({ to: opts.to }, "Email sent via SMTP");
    return true;
  } catch (err: any) {
    logger.error(
      { errCode: err?.code, errResponse: err?.response, errMessage: err?.message },
      "Failed to send email via SMTP"
    );
    return false;
  }
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<boolean> {
  return sendMail({
    to,
    subject: `${code} — сброс пароля Nova`,
    text: `Код для сброса пароля: ${code}\n\nКод действителен 15 минут.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#2563eb;">Сброс пароля</h2>
        <p>Код для сброса пароля в Nova:</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:6px;background:#f1f5f9;padding:16px 24px;border-radius:8px;text-align:center;margin:16px 0;">${code}</div>
        <p style="color:#64748b;font-size:14px;">Код действителен 15 минут. Если вы не запрашивали сброс — просто проигнорируйте это письмо.</p>
      </div>
    `,
  });
}

export async function sendVerificationEmail(to: string, code: string): Promise<boolean> {
  return sendMail({
    to,
    subject: `${code} — код подтверждения Nova`,
    text: `Ваш код подтверждения: ${code}\n\nКод действителен 30 минут.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#2563eb;">Подтверждение email</h2>
        <p>Ваш код подтверждения для Nova:</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:6px;background:#f1f5f9;padding:16px 24px;border-radius:8px;text-align:center;margin:16px 0;">${code}</div>
        <p style="color:#64748b;font-size:14px;">Код действителен 30 минут. Если вы не регистрировались в Nova — просто проигнорируйте это письмо.</p>
      </div>
    `,
  });
}
