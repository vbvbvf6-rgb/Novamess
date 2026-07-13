import nodemailer from "nodemailer";
import { logger } from "./logger";

// Sends real emails via the user's own Gmail account using an "App Password"
// (free, no third-party email service needed). If GMAIL_USER/GMAIL_APP_PASSWORD
// aren't configured, mail sending is a no-op — callers should treat send
// failures as non-fatal since verification codes are also usable manually.

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;
let initialized = false;

function getTransporter() {
  if (initialized) return transporter;
  initialized = true;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    logger.warn("GMAIL_USER/GMAIL_APP_PASSWORD not configured — email sending disabled, verification codes will not be emailed");
    return null;
  }
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return transporter;
}

export function isMailerConfigured(): boolean {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<boolean> {
  const t = getTransporter();
  if (!t) return false;
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
    return true;
  } catch (err) {
    logger.error({ err }, "Failed to send password reset email");
    return false;
  }
}

export async function sendVerificationEmail(to: string, code: string): Promise<boolean> {
  const t = getTransporter();
  if (!t) return false;
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
    return true;
  } catch (err) {
    logger.error({ err }, "Failed to send verification email");
    return false;
  }
}
