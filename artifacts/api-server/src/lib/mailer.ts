import nodemailer from "nodemailer";
import { logger } from "./logger";

function createTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
}

export function isMailerConfigured(): boolean {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

async function sendMail(opts: { to: string; subject: string; text: string; html: string }): Promise<boolean> {
  const t = createTransporter();
  if (!t) {
    logger.warn("Mailer not configured — set GMAIL_USER and GMAIL_APP_PASSWORD");
    return false;
  }
  try {
    await t.sendMail({ from: `"Nova" <${process.env.GMAIL_USER}>`, ...opts });
    logger.info({ to: opts.to }, "Email sent");
    return true;
  } catch (err: any) {
    logger.error({ errCode: err?.code, errResponse: err?.response, errMessage: err?.message }, "Failed to send email");
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
