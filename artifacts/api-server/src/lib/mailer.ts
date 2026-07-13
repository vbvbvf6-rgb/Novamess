import nodemailer from "nodemailer";
import { logger } from "./logger";

// Sends real emails via the user's own Gmail account using an "App Password".
// Transporter is created fresh on each call so env vars are always read at
// send time (no "initialized" singleton that could cache a null on startup).

function createTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,          // SSL — more reliable from cloud IPs than STARTTLS
    auth: { user, pass },
  });
}

export function isMailerConfigured(): boolean {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<boolean> {
  const t = createTransporter();
  if (!t) {
    logger.warn("sendPasswordResetEmail: mailer not configured (GMAIL_USER/GMAIL_APP_PASSWORD missing)");
    return false;
  }
  try {
    await t.sendMail({
      from: `"Nova" <${process.env.GMAIL_USER}>`,
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
    logger.info({ to }, "Password reset email sent");
    return true;
  } catch (err: any) {
    logger.error({ err, code: err?.code, command: err?.command, response: err?.response }, "Failed to send password reset email");
    return false;
  }
}

export async function sendVerificationEmail(to: string, code: string): Promise<boolean> {
  const t = createTransporter();
  if (!t) {
    logger.warn("sendVerificationEmail: mailer not configured (GMAIL_USER/GMAIL_APP_PASSWORD missing)");
    return false;
  }
  try {
    await t.sendMail({
      from: `"Nova" <${process.env.GMAIL_USER}>`,
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
    logger.info({ to }, "Verification email sent");
    return true;
  } catch (err: any) {
    logger.error({ err, code: err?.code, command: err?.command, response: err?.response }, "Failed to send verification email");
    return false;
  }
}
