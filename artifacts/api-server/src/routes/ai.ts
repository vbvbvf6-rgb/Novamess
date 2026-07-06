import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

const BOT_USERNAME = "nova_ai";
const TIMEOUT_MS = 7000;
const MAX_TOKENS = 500;

async function raceFirst(tasks: Promise<string | undefined>[]): Promise<string | undefined> {
  return new Promise((resolve) => {
    let settled = 0;
    for (const t of tasks) {
      t.then(val => { if (val) resolve(val); else if (++settled === tasks.length) resolve(undefined); })
       .catch(() => { if (++settled === tasks.length) resolve(undefined); });
    }
  });
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  messages: object[],
): Promise<string | undefined> {
  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://pulse-messenger.replit.app",
        "X-Title": "Pulse Messenger",
      },
      body: JSON.stringify({ model, messages, max_tokens: MAX_TOKENS, temperature: 0.7 }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) return undefined;
    const data = await r.json() as any;
    return (data.choices?.[0]?.message?.content as string | undefined)?.trim() || undefined;
  } catch {
    return undefined;
  }
}

async function callPollinations(
  systemPrompt: string,
  userMessage: string,
  history: { role: string; content: string }[],
  model: string,
): Promise<string | undefined> {
  try {
    const conversationText = history
      .map(m => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`)
      .join("\n");
    const fullPrompt = conversationText
      ? `${conversationText}\nUser: ${userMessage}\nAssistant:`
      : userMessage;
    const url = `https://text.pollinations.ai/${encodeURIComponent(fullPrompt)}?model=${model}&system=${encodeURIComponent(systemPrompt)}&seed=${Math.floor(Math.random() * 99999)}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!r.ok) return undefined;
    return (await r.text())?.trim() || undefined;
  } catch {
    return undefined;
  }
}

router.post("/ai/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Сообщение обязательно" });
    }

    const systemPrompt = "Ты — дружелюбный и умный ИИ-помощник в мессенджере Nova. Отвечай кратко, по существу и преимущественно на русском языке, если пользователь пишет по-русски. Ты умеешь помогать с любыми вопросами.";
    const historySlice = Array.isArray(history) ? history.slice(-10) : [];
    const messages = [
      { role: "system", content: systemPrompt },
      ...historySlice,
      { role: "user", content: message },
    ];

    const apiKey = process.env["DEEP_SEEK"];

    const tasks: Promise<string | undefined>[] = [
      callPollinations(systemPrompt, message, historySlice, "phi"),
      callPollinations(systemPrompt, message, historySlice, "mistral"),
    ];

    if (apiKey) {
      tasks.unshift(
        callOpenRouter(apiKey, "deepseek/deepseek-chat", messages),
        callOpenRouter(apiKey, "google/gemini-flash-1.5", messages),
        callOpenRouter(apiKey, "openai/gpt-4o-mini", messages),
      );
    }

    const reply = await raceFirst(tasks);

    if (!reply) {
      return res.status(502).json({ error: "Все AI провайдеры не ответили. Попробуйте позже." });
    }

    res.json({ reply });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/ai/summarize", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Нет сообщений для резюме" });
    }
    const snippet = messages
      .slice(-30)
      .map((m: any) => `${m.senderName || "Пользователь"}: ${m.text || ""}`)
      .filter((s: string) => s.trim().length > 5)
      .join("\n");
    if (!snippet.trim()) return res.status(400).json({ error: "Недостаточно текста для резюме" });

    const systemPrompt = "Ты — помощник-аналитик в мессенджере Aether. Составь краткое резюме переписки (2-4 предложения). Выдели главные темы и итоги. Отвечай ТОЛЬКО на русском языке. Будь чётким и лаконичным.";
    const apiKey = process.env["DEEP_SEEK"];
    const userMsg = `Вот переписка:\n${snippet}\n\nСоставь краткое резюме.`;

    const tasks: Promise<string | undefined>[] = [
      callPollinations(systemPrompt, userMsg, [], "mistral"),
      callPollinations(systemPrompt, userMsg, [], "phi"),
    ];
    if (apiKey) {
      tasks.unshift(
        callOpenRouter(apiKey, "openai/gpt-4o-mini", [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ]),
      );
    }

    const reply = await raceFirst(tasks);
    if (!reply) return res.status(502).json({ error: "AI не ответил. Попробуйте позже." });
    res.json({ summary: reply });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/ai/bot-user", async (req, res) => {
  try {
    const rows = await db.execute(
      sql`SELECT id, username, display_name, avatar_color, is_bot, is_verified FROM users WHERE username = ${BOT_USERNAME}`
    );
    const bot = rows.rows[0] as any;
    if (!bot) return res.status(404).json({ error: "Бот не найден" });
    res.json({
      id: bot.id,
      username: bot.username,
      displayName: bot.display_name,
      avatarColor: bot.avatar_color,
      isBot: bot.is_bot,
      isVerified: bot.is_verified,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export default router;
