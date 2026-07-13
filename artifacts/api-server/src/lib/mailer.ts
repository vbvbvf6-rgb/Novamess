import nodemailer from "nodemailer";
import { logger } from "./logger";

function createTransporter() {
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
    process.env.SMTP_USER ||
    process.env.GMAIL_USER ||
    "noreply@nova.app"
  );
}

export function isMailerConfigured(): boolean {
  const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  const hasGmail = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  return hasSmtp || hasGmail;
}

/** Call once at startup to verify SMTP credentials — logs result clearly. */
export async function testMailerConnection(): Promise<void> {
  const t = createTransporter();
  if (!t) {
    console.warn(
      "[mailer] NOT configured — set SMTP_HOST+SMTP_USER+SMTP_PASS (Yandex/any SMTP) " +
      "or GMAIL_USER+GMAIL_APP_PASSWORD. Emails will not be sent."
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
  const t = createTransporter();
  if (!t) {
    logger.warn("Mailer not configured — set SMTP_HOST+SMTP_USER+SMTP_PASS or GMAIL_USER+GMAIL_APP_PASSWORD");
    return false;
  }
  const from = `"Nova" <${getSenderAddress()}>`;
  try {
    await t.sendMail({ from, ...opts });
    logger.info({ to: opts.to }, "Email sent");
    return true;
  } catch (err: any) {
    logger.error(
      { errCode: err?.code, errResponse: err?.response, errMessage: err?.message },
      "Failed to send email"
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
