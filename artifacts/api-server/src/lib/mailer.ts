import nodemailer from "nodemailer";
import { logger } from "./logger";

// ── Email transport ─────────────────────────────────────────────────────────
//
// Priority 1 — Generic SMTP (recommended for cloud deployments like Render):
//   Works with Brevo (ex-Sendinblue), Mailgun, SendGrid, SMTP2Go, etc.
//   These providers allow connections from cloud-hosting IPs, unlike Gmail.
//   Set these 4 env vars in Render → Environment:
//     SMTP_HOST   e.g. smtp-relay.brevo.com
//     SMTP_PORT   e.g. 587
//     SMTP_USER   your SMTP login (e.g. your Brevo account email)
//     SMTP_PASS   your SMTP password / API key
//     SMTP_FROM   sender address shown to recipients (e.g. noreply@yourdomain.com)
//
// Priority 2 — Gmail (fallback, often blocked by cloud hosting IPs):
//     GMAIL_USER          your Gmail address
//     GMAIL_APP_PASSWORD  a Google App Password (not your main password)
//
// If neither is configured, email sending is silently skipped and a warning
// is logged. The app continues to work — email features are simply unavailable.

function createTransporter() {
  // 1. Generic SMTP — preferred for cloud deployments
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

  // 2. Gmail fallback
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
  if (process.env.SMTP_FROM) return process.env.SMTP_FROM;
  if (process.env.SMTP_USER) return process.env.SMTP_USER;
  if (process.env.GMAIL_USER) return process.env.GMAIL_USER;
  return "noreply@nova.app";
}

export function isMailerConfigured(): boolean {
  const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  const hasGmail = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  return hasSmtp || hasGmail;
}

async function sendMail(opts: { to: string; subject: string; text: string; html: string }): Promise<boolean> {
  const t = createTransporter();
  if (!t) {
    logger.warn(
      "Mailer not configured — set SMTP_HOST/SMTP_USER/SMTP_PASS (e.g. Brevo) " +
      "or GMAIL_USER/GMAIL_APP_PASSWORD in environment variables."
    );
    return false;
  }

  const from = `"Nova" <${getSenderAddress()}>`;

  try {
    await t.sendMail({ from, ...opts });
    logger.info({ to: opts.to, subject: opts.subject }, "Email sent");
    return true;
  } catch (err: any) {
    logger.error(
      {
        provider: process.env.SMTP_HOST ? `SMTP(${process.env.SMTP_HOST})` : "Gmail",
        errCode: err?.code,
        errCommand: err?.command,
        errResponse: err?.response,
        errMessage: err?.message,
      },
      "Failed to send email — check SMTP credentials and that your provider allows connections from cloud IPs"
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
