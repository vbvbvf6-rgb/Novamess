import nodemailer from "nodemailer";
import { logger } from "./logger";

// ── Email transport ─────────────────────────────────────────────────────────
//
// Priority 1 — Gmail OAuth2 (HTTPS-based, never blocked by cloud IPs like Render):
//   GMAIL_USER             your Gmail address
//   GOOGLE_CLIENT_ID       from Google Cloud Console
//   GOOGLE_CLIENT_SECRET   from Google Cloud Console
//   GMAIL_REFRESH_TOKEN    long-lived refresh token from OAuth2 Playground
//
// Priority 2 — Generic SMTP (Brevo, Mailgun, SendGrid, etc.):
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
//
// Priority 3 — Gmail plain SMTP (fallback; often blocked by cloud hosting IPs):
//   GMAIL_USER, GMAIL_APP_PASSWORD

function createTransporter() {
  const gmailUser = process.env.GMAIL_USER;

  // 1. Gmail OAuth2 — best for cloud deployments (Render, Railway, Fly.io, etc.)
  if (
    gmailUser &&
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN
  ) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: gmailUser,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      },
    } as any);
  }

  // 2. Generic SMTP
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });
  }

  // 3. Gmail plain SMTP (fallback — may be blocked by cloud IPs)
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
  if (process.env.GMAIL_USER) return process.env.GMAIL_USER;
  if (process.env.SMTP_FROM) return process.env.SMTP_FROM;
  if (process.env.SMTP_USER) return process.env.SMTP_USER;
  return "noreply@nova.app";
}

export function isMailerConfigured(): boolean {
  const hasOAuth2 = !!(
    process.env.GMAIL_USER &&
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN
  );
  const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  const hasGmail = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  return hasOAuth2 || hasSmtp || hasGmail;
}

async function sendMail(opts: { to: string; subject: string; text: string; html: string }): Promise<boolean> {
  const t = createTransporter();
  if (!t) {
    logger.warn(
      "Mailer not configured. For Gmail on Render: set GMAIL_USER + GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GMAIL_REFRESH_TOKEN"
    );
    return false;
  }

  const from = `"Nova" <${getSenderAddress()}>`;
  const provider = process.env.GMAIL_REFRESH_TOKEN ? "Gmail-OAuth2"
    : process.env.SMTP_HOST ? `SMTP(${process.env.SMTP_HOST})`
    : "Gmail-SMTP";

  try {
    await t.sendMail({ from, ...opts });
    logger.info({ to: opts.to, subject: opts.subject, provider }, "Email sent");
    return true;
  } catch (err: any) {
    logger.error(
      {
        provider,
        errCode: err?.code,
        errCommand: err?.command,
        errResponse: err?.response,
        errMessage: err?.message,
      },
      "Failed to send email"
    );
    return false;
  }
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<boolean> {
  return sendMail({
    to,
    subject: `${code} — сброс пароля Nova`,
    text: `Код для сброса пароля: ${code}\n\nКод действителен 15 минут. Если вы не запрашивали сброс пароля — просто проигнорируйте это письмо.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#2563eb;">Сброс пароля</h2>
        <p>Код для сброса пароля в Nova:</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:6px;background:#f1f5f9;padding:16px 24px;border-radius:8px;text-align:center;margin:16px 0;">${code}</div>
        <p style="color:#64748b;font-size:14px;">Код действителен 15 минут. Если вы не запрашивали сброс пароля — просто проигнорируйте это письмо.</p>
      </div>
    `,
  });
}

export async function sendVerificationEmail(to: string, code: string): Promise<boolean> {
  return sendMail({
    to,
    subject: `${code} — код подтверждения Nova`,
    text: `Ваш код подтверждения: ${code}\n\nКод действителен 30 минут. Если вы не регистрировались в Nova, просто проигнорируйте это письмо.`,
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
