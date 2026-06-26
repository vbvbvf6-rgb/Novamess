import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Plus, Trash2, RefreshCw, Copy, Check, ChevronRight,
  Code2, Webhook, Eye, EyeOff, Pencil, X, Terminal, ExternalLink,
  ChevronDown, ChevronUp, Zap, MessageSquare, Globe, Camera, MessageCircle,
  BookOpen, Play, Download, Hash, List, Keyboard, Clock, ArrowRight, CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAppContext } from "@/contexts/AppContext";

function compressAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const size = 200;
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("no ctx")); return; }
      const s = Math.min(img.width, img.height);
      const sx = (img.width - s) / 2, sy = (img.height - s) / 2;
      ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function getUserIdHeader(): Record<string, string> {
  const token = sessionStorage.getItem("pulse-token");
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

interface BotRecord {
  id: number;
  bot_user_id: number;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_color: string;
  avatar_url: string | null;
  token: string;
  webhook_url: string | null;
  inline_code: string | null;
  created_at: string;
}

const makePulseBotPy = (host: string) => `"""
pulse_bot.py  —  Python SDK для Aether Messenger Bot API
════════════════════════════════════════════════════════

Установка зависимости:
    pip install requests

Быстрый старт:
    import pulse_bot

    bot = pulse_bot.Bot("ВАШ_ТОКЕН")

    @bot.command("/start")
    def on_start(msg):
        bot.reply(msg, "Привет! Я бот 🤖")

    bot.polling()

Документация: ${host}/bots  (вкладка Python SDK)
"""

import time
import json
import threading
import requests
from typing import Callable, Optional, Any

BASE_URL = "${host}/bot"


# ══════════════════════════════════════════════════════════
#  Вспомогательные типы
# ══════════════════════════════════════════════════════════

def inline_keyboard(*rows):
    """Создать инлайн-клавиатуру из рядов кнопок.

    Пример:
        kb = inline_keyboard(
            [btn("Да", data="yes"), btn("Нет", data="no")],
            [btn("Отмена", data="cancel")]
        )
        bot.send_message(chat_id, "Выбери:", reply_markup=kb)
    """
    return {"inline_keyboard": list(rows)}


def btn(text: str, data: str = "", url: str = "") -> dict:
    """Создать кнопку для инлайн-клавиатуры.

    Args:
        text: Текст на кнопке
        data: callback_data — придёт в callback_query при нажатии
        url: URL — откроет ссылку при нажатии
    """
    b: dict = {"text": text}
    if url:
        b["url"] = url
    else:
        b["callback_data"] = data or text
    return b


def row(*buttons) -> list:
    """Создать ряд кнопок."""
    return list(buttons)


# ══════════════════════════════════════════════════════════
#  Основной класс Bot
# ══════════════════════════════════════════════════════════

class Bot:
    """Клиент Aether Bot API.

    Args:
        token: Токен бота из Aura
        base_url: URL API (по умолчанию — Aura)
    """

    def __init__(self, token: str, base_url: str = BASE_URL):
        self.token = token
        self.base_url = base_url.rstrip("/")
        self._message_handlers: list = []   # (filter_fn, handler)
        self._command_handlers: dict = {}   # "/cmd" → handler
        self._callback_handlers: list = []  # (filter_fn, handler)
        self._offset = 0
        self._running = False

    # ──────────────────────────────────────────────────────
    #  Внутренние методы HTTP
    # ──────────────────────────────────────────────────────

    def _url(self, method: str) -> str:
        return f"{self.base_url}/{self.token}/{method}"

    def _get(self, method: str, **params) -> Any:
        r = requests.get(self._url(method), params=params, timeout=35)
        data = r.json()
        if not data.get("ok"):
            raise RuntimeError(data.get("description", f"API error: {method}"))
        return data["result"]

    def _post(self, method: str, **kwargs) -> Any:
        r = requests.post(self._url(method), json=kwargs, timeout=15)
        data = r.json()
        if not data.get("ok"):
            raise RuntimeError(data.get("description", f"API error: {method}"))
        return data["result"]

    # ──────────────────────────────────────────────────────
    #  Информация о боте
    # ──────────────────────────────────────────────────────

    def get_me(self) -> dict:
        """Получить информацию о боте (id, username, display_name)."""
        return self._get("getMe")

    # ──────────────────────────────────────────────────────
    #  Отправка сообщений
    # ──────────────────────────────────────────────────────

    def send_message(self, chat_id: int, text: str,
                     reply_to_message_id: Optional[int] = None,
                     reply_markup: Optional[dict] = None,
                     parse_mode: Optional[str] = None) -> dict:
        """Отправить текстовое сообщение.

        Args:
            chat_id: ID чата
            text: Текст сообщения
            reply_to_message_id: ID сообщения для ответа (опционально)
            reply_markup: Инлайн-клавиатура (см. inline_keyboard())
            parse_mode: Форматирование — "Markdown" или "HTML"
        """
        kwargs: dict = {"chat_id": chat_id, "text": text}
        if reply_to_message_id:
            kwargs["reply_to_message_id"] = reply_to_message_id
        if reply_markup:
            kwargs["reply_markup"] = reply_markup
        if parse_mode:
            kwargs["parse_mode"] = parse_mode
        return self._post("sendMessage", **kwargs)

    def reply(self, message: dict, text: str,
              reply_markup: Optional[dict] = None,
              parse_mode: Optional[str] = None) -> dict:
        """Ответить на сообщение (удобный хелпер).

        Args:
            message: Объект сообщения из обработчика
            text: Текст ответа
            reply_markup: Инлайн-клавиатура (опционально)
        """
        return self.send_message(
            chat_id=message["chat"]["id"],
            text=text,
            reply_to_message_id=message["message_id"],
            reply_markup=reply_markup,
            parse_mode=parse_mode,
        )

    def send_photo(self, chat_id: int, photo: str,
                   caption: Optional[str] = None,
                   reply_markup: Optional[dict] = None) -> dict:
        """Отправить фото по URL.

        Args:
            chat_id: ID чата
            photo: URL изображения
            caption: Подпись под фото
            reply_markup: Инлайн-клавиатура (опционально)
        """
        kwargs: dict = {"chat_id": chat_id, "photo": photo}
        if caption:
            kwargs["caption"] = caption
        if reply_markup:
            kwargs["reply_markup"] = reply_markup
        return self._post("sendPhoto", **kwargs)

    def edit_message(self, chat_id: int, message_id: int,
                     text: str,
                     reply_markup: Optional[dict] = None) -> dict:
        """Изменить текст отправленного сообщения.

        Args:
            chat_id: ID чата
            message_id: ID сообщения для изменения
            text: Новый текст
            reply_markup: Новая клавиатура (опционально)
        """
        kwargs: dict = {"chat_id": chat_id, "message_id": message_id, "text": text}
        if reply_markup:
            kwargs["reply_markup"] = reply_markup
        return self._post("editMessageText", **kwargs)

    def answer_callback(self, callback_query_id: str,
                        text: Optional[str] = None,
                        show_alert: bool = False) -> bool:
        """Ответить на нажатие кнопки (обязательно вызывать в callback-обработчиках).

        Args:
            callback_query_id: ID из callback_query объекта
            text: Текст всплывающего уведомления (опционально)
            show_alert: Показать как модальное окно вместо тоста
        """
        kwargs: dict = {"callback_query_id": callback_query_id}
        if text:
            kwargs["text"] = text
            kwargs["show_alert"] = show_alert
        return self._post("answerCallbackQuery", **kwargs)

    # ──────────────────────────────────────────────────────
    #  Информация о чате
    # ──────────────────────────────────────────────────────

    def get_chat(self, chat_id: int) -> dict:
        """Получить информацию о чате."""
        return self._get("getChat", chat_id=chat_id)

    def leave_chat(self, chat_id: int) -> bool:
        """Покинуть чат."""
        return self._post("leaveChat", chat_id=chat_id)

    # ──────────────────────────────────────────────────────
    #  Webhook
    # ──────────────────────────────────────────────────────

    def set_webhook(self, url: str, secret_token: Optional[str] = None):
        """Установить URL для webhook.

        После этого Aether будет отправлять POST-запросы на ваш URL
        при каждом новом обновлении. Polling при этом работать не будет.
        """
        kwargs: dict = {"url": url}
        if secret_token:
            kwargs["secret_token"] = secret_token
        return self._post("setWebhook", **kwargs)

    def delete_webhook(self):
        """Удалить webhook и вернуться к polling-режиму."""
        return self._post("deleteWebhook")

    def get_webhook_info(self) -> dict:
        """Получить текущую информацию о webhook."""
        return self._get("getWebhookInfo")

    # ──────────────────────────────────────────────────────
    #  Декораторы обработчиков
    # ──────────────────────────────────────────────────────

    def command(self, cmd: str):
        """Декоратор: обрабатывать команду.

        Пример:
            @bot.command("/start")
            def on_start(msg):
                bot.reply(msg, "Привет!")

            @bot.command("/help")
            def on_help(msg):
                bot.reply(msg, "Список команд: /start /help")
        """
        def decorator(fn: Callable):
            self._command_handlers[cmd] = fn
            return fn
        return decorator

    def message_handler(self, func: Optional[Callable] = None):
        """Декоратор: обрабатывать входящие сообщения.

        Args:
            func: Функция-фильтр (необязательно). Получает message, должна вернуть True/False.
                  Если не указана — обработчик вызывается для всех сообщений.

        Пример:
            @bot.message_handler()
            def on_any(msg):
                bot.reply(msg, f"Ты написал: {msg.get('text', '')}")

            @bot.message_handler(func=lambda m: "фото" in m.get("text",""))
            def on_photo_request(msg):
                bot.reply(msg, "Вот фото!")
        """
        def decorator(fn: Callable):
            self._message_handlers.append((func, fn))
            return fn
        return decorator

    def callback_handler(self, data: Optional[str] = None):
        """Декоратор: обрабатывать нажатие инлайн-кнопки.

        Args:
            data: callback_data для фильтрации. Если не указан — вызывается для всех кнопок.

        Пример:
            @bot.callback_handler(data="yes")
            def on_yes(query):
                bot.answer_callback(query["id"], "Отлично!")
                bot.send_message(query["message"]["chat"]["id"], "Вы выбрали ДА")

            @bot.callback_handler()
            def on_any_button(query):
                bot.answer_callback(query["id"])
        """
        def decorator(fn: Callable):
            self._callback_handlers.append((data, fn))
            return fn
        return decorator

    # ──────────────────────────────────────────────────────
    #  Обработка обновлений
    # ──────────────────────────────────────────────────────

    def get_updates(self, offset: int = 0, limit: int = 100,
                    timeout: int = 30) -> list:
        """Получить список новых обновлений (long polling)."""
        return self._get("getUpdates", offset=offset, limit=limit, timeout=timeout)

    def process_update(self, update: dict):
        """Обработать одно обновление (полезно для webhook-режима)."""
        if "message" in update:
            self._dispatch_message(update["message"])
        elif "callback_query" in update:
            self._dispatch_callback(update["callback_query"])

    def _dispatch_message(self, message: dict):
        text = message.get("text", "")
        if text.startswith("/"):
            cmd = text.split()[0].lower()
            if cmd in self._command_handlers:
                self._command_handlers[cmd](message)
                return
        for filter_fn, handler in self._message_handlers:
            try:
                if filter_fn is None or filter_fn(message):
                    handler(message)
                    return
            except Exception as e:
                print(f"[pulse_bot] Handler error: {e}")

    def _dispatch_callback(self, query: dict):
        data = query.get("data", "")
        for match_data, handler in self._callback_handlers:
            if match_data is None or match_data == data:
                try:
                    handler(query)
                except Exception as e:
                    print(f"[pulse_bot] Callback handler error: {e}")
                return

    # ──────────────────────────────────────────────────────
    #  Polling
    # ──────────────────────────────────────────────────────

    def polling(self, interval: float = 0.5):
        """Запустить long-polling (блокирует поток до Ctrl+C).

        Бот автоматически получает обновления и вызывает нужные обработчики.

        Args:
            interval: Задержка между запросами в секундах (по умолчанию 0.5)
        """
        self._running = True
        me = self.get_me()
        print(f"[pulse_bot] ✅ Бот запущен: @{me['username']} ({me.get('display_name', '')})")
        print(f"[pulse_bot] Остановить: Ctrl+C")
        print("-" * 40)
        while self._running:
            try:
                updates = self.get_updates(offset=self._offset, timeout=30)
                for upd in updates:
                    self._offset = upd["update_id"] + 1
                    try:
                        self.process_update(upd)
                    except Exception as e:
                        print(f"[pulse_bot] Update error: {e}")
            except KeyboardInterrupt:
                print("\\n[pulse_bot] Бот остановлен.")
                self._running = False
                break
            except Exception as e:
                print(f"[pulse_bot] Polling error: {e}")
                time.sleep(interval)

    def stop_polling(self):
        """Остановить polling."""
        self._running = False
`;

const EXAMPLES: Record<string, { label: string; icon: React.ReactNode; desc: string; code: (token: string, host: string) => string }> = {
  echo: {
    label: "Эхо-бот",
    icon: <MessageSquare size={14} />,
    desc: "Простейший бот — повторяет всё, что ему пишут",
    code: (token, host) => `import pulse_bot

bot = pulse_bot.Bot("${token || 'ВАШ_ТОКЕН'}")

@bot.command("/start")
def on_start(msg):
    bot.reply(msg, "Привет! Я эхо-бот 🤖\\nПиши что-нибудь, повторю!")

@bot.command("/help")
def on_help(msg):
    bot.reply(msg, "Доступные команды:\\n/start — Начать\\n/help — Помощь")

@bot.message_handler()
def echo(msg):
    text = msg.get("text", "")
    bot.reply(msg, f"🔁 {text}")

bot.polling()`,
  },
  commands: {
    label: "Команды",
    icon: <Hash size={14} />,
    desc: "Бот с набором команд: погода, время, случайные числа",
    code: (token, host) => `import pulse_bot
import random
from datetime import datetime

bot = pulse_bot.Bot("${token || 'ВАШ_ТОКЕН'}")

@bot.command("/start")
def on_start(msg):
    name = msg["from"].get("first_name", "")
    bot.reply(msg,
        f"Привет, {name}! 👋\\n\\n"
        "Я умею:\\n"
        "/time — текущее время\\n"
        "/random — случайное число\\n"
        "/dice — бросить кубик 🎲"
    )

@bot.command("/time")
def on_time(msg):
    now = datetime.now().strftime("%H:%M:%S, %d.%m.%Y")
    bot.reply(msg, f"🕐 Текущее время: {now}")

@bot.command("/random")
def on_random(msg):
    n = random.randint(1, 100)
    bot.reply(msg, f"🎯 Случайное число: {n}")

@bot.command("/dice")
def on_dice(msg):
    n = random.randint(1, 6)
    faces = ["⚀","⚁","⚂","⚃","⚄","⚅"]
    bot.reply(msg, f"{faces[n-1]} Выпало: {n}")

bot.polling()`,
  },
  keyboard: {
    label: "Кнопки",
    icon: <Keyboard size={14} />,
    desc: "Инлайн-кнопки и обработка нажатий",
    code: (token, host) => `import pulse_bot
from pulse_bot import inline_keyboard, btn, row

bot = pulse_bot.Bot("${token || 'ВАШ_ТОКЕН'}")

MENU = inline_keyboard(
    row(btn("🎮 Игры", data="games"), btn("📰 Новости", data="news")),
    row(btn("⚙️ Настройки", data="settings")),
    row(btn("🌐 Наш сайт", url="https://aura.app")),
)

@bot.command("/start")
def on_start(msg):
    bot.send_message(
        msg["chat"]["id"],
        "Добро пожаловать! Выбери раздел:",
        reply_markup=MENU
    )

@bot.callback_handler(data="games")
def on_games(query):
    bot.answer_callback(query["id"], "🎮 Раздел игр")
    bot.edit_message(
        query["message"]["chat"]["id"],
        query["message"]["message_id"],
        "Игры пока в разработке 🛠️",
        reply_markup=inline_keyboard(row(btn("◀ Назад", data="back")))
    )

@bot.callback_handler(data="news")
def on_news(query):
    bot.answer_callback(query["id"], "📰 Новости")
    bot.edit_message(
        query["message"]["chat"]["id"],
        query["message"]["message_id"],
        "Последние новости появятся здесь 📡",
        reply_markup=inline_keyboard(row(btn("◀ Назад", data="back")))
    )

@bot.callback_handler(data="back")
def on_back(query):
    bot.answer_callback(query["id"])
    bot.edit_message(
        query["message"]["chat"]["id"],
        query["message"]["message_id"],
        "Добро пожаловать! Выбери раздел:",
        reply_markup=MENU
    )

bot.polling()`,
  },
  filter: {
    label: "Фильтры",
    icon: <List size={14} />,
    desc: "Умная фильтрация сообщений по содержимому",
    code: (token, host) => `import pulse_bot

bot = pulse_bot.Bot("${token || 'ВАШ_ТОКЕН'}")

# Только сообщения с URL
@bot.message_handler(func=lambda m: "http" in m.get("text", ""))
def on_link(msg):
    bot.reply(msg, "🔗 Вижу ссылку! Обрабатываю...")

# Только числа
@bot.message_handler(func=lambda m: m.get("text","").strip().isdigit())
def on_number(msg):
    n = int(msg["text"])
    bot.reply(msg, f"📊 Число {n} × 2 = {n * 2}")

# Только длинные сообщения
@bot.message_handler(func=lambda m: len(m.get("text","")) > 100)
def on_long(msg):
    words = len(m.get("text","").split())
    bot.reply(msg, f"📝 Длинное сообщение! Слов: {words}")

# Всё остальное
@bot.message_handler()
def on_any(msg):
    bot.reply(msg, "Не понимаю 🤔 Попробуй /start")

bot.polling()`,
  },
  scheduler: {
    label: "Расписание",
    icon: <Clock size={14} />,
    desc: "Отправка сообщений по расписанию в фоне",
    code: (token, host) => `import pulse_bot
import threading
import time
from datetime import datetime

bot = pulse_bot.Bot("${token || 'ВАШ_ТОКЕН'}")

subscribers = set()  # chat_id подписчиков

@bot.command("/start")
def on_start(msg):
    chat_id = msg["chat"]["id"]
    subscribers.add(chat_id)
    bot.reply(msg,
        "✅ Подписка оформлена!\\n"
        "Буду присылать новости каждые 60 секунд.\\n"
        "/stop — отписаться"
    )

@bot.command("/stop")
def on_stop(msg):
    subscribers.discard(msg["chat"]["id"])
    bot.reply(msg, "❌ Отписка оформлена.")

def broadcast_loop():
    counter = 0
    while True:
        time.sleep(60)
        counter += 1
        if not subscribers:
            continue
        now = datetime.now().strftime("%H:%M")
        text = f"📡 Рассылка #{counter} в {now}\\nВсё идёт хорошо! ✅"
        for chat_id in list(subscribers):
            try:
                bot.send_message(chat_id, text)
            except Exception as e:
                print(f"Ошибка отправки в {chat_id}: {e}")

# Запускаем рассылку в фоновом потоке
t = threading.Thread(target=broadcast_loop, daemon=True)
t.start()

bot.polling()`,
  },
};

const API_METHODS = [
  { method: "bot.reply(msg, text)", desc: "Ответить на сообщение", type: "Хелпер" },
  { method: "bot.send_message(chat_id, text)", desc: "Отправить сообщение в чат", type: "POST" },
  { method: "bot.send_photo(chat_id, url)", desc: "Отправить фото по URL", type: "POST" },
  { method: "bot.edit_message(chat_id, msg_id, text)", desc: "Изменить сообщение", type: "POST" },
  { method: "bot.answer_callback(query_id)", desc: "Ответить на нажатие кнопки", type: "POST" },
  { method: "bot.get_me()", desc: "Информация о боте", type: "GET" },
  { method: "bot.get_chat(chat_id)", desc: "Информация о чате", type: "GET" },
  { method: "bot.leave_chat(chat_id)", desc: "Покинуть чат", type: "POST" },
  { method: "bot.get_updates(offset)", desc: "Получить обновления (polling)", type: "GET" },
  { method: "bot.set_webhook(url)", desc: "Установить webhook URL", type: "POST" },
  { method: "bot.delete_webhook()", desc: "Удалить webhook", type: "POST" },
];

const STEPS = [
  { num: 1, title: "Создайте бота", desc: "Перейдите во вкладку «Мои боты» и нажмите «Создать нового бота». Получите токен.", icon: <Bot size={18} /> },
  { num: 2, title: "Скачайте SDK", desc: "Нажмите кнопку «Скачать pulse_bot.py» ниже. Положите файл рядом с вашим скриптом.", icon: <Download size={18} /> },
  { num: 3, title: "Напишите бота", desc: "Скопируйте любой пример, вставьте токен из шага 1 и запустите python my_bot.py", icon: <Play size={18} /> },
];

export default function Bots() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { setSelectedChatId } = useAppContext() as any;
  const [bots, setBots] = useState<BotRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedBot, setSelectedBot] = useState<BotRecord | null>(null);
  const [showToken, setShowToken] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"bots" | "sdk">("bots");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [editBot, setEditBot] = useState<BotRecord | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState<number | null>(null);
  const [codeBot, setCodeBot] = useState<BotRecord | null>(null);
  const [codeText, setCodeText] = useState("");
  const [savingCode, setSavingCode] = useState(false);
  const [activeExample, setActiveExample] = useState<keyof typeof EXAMPLES>("echo");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const avatarUploadBotRef = useRef<number | null>(null);

  const fetchBots = useCallback(async () => {
    try {
      const res = await fetch("/api/bots", { headers: getUserIdHeader() });
      if (res.ok) setBots(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchBots(); }, [fetchBots]);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newUsername.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getUserIdHeader() },
        body: JSON.stringify({ name: newName.trim(), username: newUsername.trim(), description: newDesc.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: `Бот @${data.username} создан!`, description: "Токен сгенерирован и готов к использованию" });
        setShowCreate(false);
        setNewName(""); setNewUsername(""); setNewDesc("");
        await fetchBots();
      } else {
        toast({ title: "Ошибка", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка сети", variant: "destructive" });
    }
    setCreating(false);
  };

  const handleDelete = async (bot: BotRecord) => {
    if (!window.confirm(`Удалить бота @${bot.username}? Это действие нельзя отменить.`)) return;
    setDeletingId(bot.bot_user_id);
    try {
      const res = await fetch(`/api/bots/${bot.bot_user_id}`, { method: "DELETE", headers: getUserIdHeader() });
      if (res.ok || res.status === 204) {
        toast({ title: `Бот @${bot.username} удалён` });
        setBots(prev => prev.filter(b => b.bot_user_id !== bot.bot_user_id));
        if (selectedBot?.bot_user_id === bot.bot_user_id) setSelectedBot(null);
      } else {
        const d = await res.json();
        toast({ title: "Ошибка", description: d.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка сети", variant: "destructive" });
    }
    setDeletingId(null);
  };

  const handleRegenerate = async (bot: BotRecord) => {
    if (!window.confirm("Сгенерировать новый токен? Старый токен перестанет работать.")) return;
    setRegenerating(bot.bot_user_id);
    try {
      const res = await fetch(`/api/bots/${bot.bot_user_id}/token`, { method: "POST", headers: getUserIdHeader() });
      if (res.ok) {
        const data = await res.json();
        setBots(prev => prev.map(b => b.bot_user_id === bot.bot_user_id ? { ...b, token: data.token } : b));
        if (selectedBot?.bot_user_id === bot.bot_user_id) setSelectedBot(prev => prev ? { ...prev, token: data.token } : null);
        toast({ title: "Токен обновлён", description: "Старый токен больше не действителен" });
      }
    } catch {
      toast({ title: "Ошибка сети", variant: "destructive" });
    }
    setRegenerating(null);
  };

  const handleEdit = async () => {
    if (!editBot || !editName.trim()) return;
    try {
      const res = await fetch(`/api/bots/${editBot.bot_user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getUserIdHeader() },
        body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() || "" }),
      });
      if (res.ok) {
        await fetchBots();
        toast({ title: "Бот обновлён" });
        setEditBot(null);
      }
    } catch {
      toast({ title: "Ошибка сети", variant: "destructive" });
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const botId = avatarUploadBotRef.current;
    if (!file || !botId) return;
    setUploadingAvatar(botId);
    try {
      const compressed = await compressAvatar(file);
      const res = await fetch(`/api/bots/${botId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getUserIdHeader() },
        body: JSON.stringify({ avatarUrl: compressed }),
      });
      if (res.ok) {
        setBots(prev => prev.map(b => b.bot_user_id === botId ? { ...b, avatar_url: compressed } : b));
        toast({ title: "Фото обновлено" });
      }
    } catch {
      toast({ title: "Ошибка загрузки фото", variant: "destructive" });
    }
    setUploadingAvatar(null);
    e.target.value = "";
  };

  const handleSaveCode = async () => {
    if (!codeBot) return;
    setSavingCode(true);
    try {
      const res = await fetch(`/api/bots/${codeBot.bot_user_id}/code`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getUserIdHeader() },
        body: JSON.stringify({ code: codeText }),
      });
      if (res.ok) {
        setBots(prev => prev.map(b => b.bot_user_id === codeBot.bot_user_id ? { ...b, inline_code: codeText.trim() || null } : b));
        toast({ title: "Код сохранён", description: codeText.trim() ? "Бот будет выполнять этот код при получении сообщений" : "Встроенный код удалён" });
        setCodeBot(null);
      } else {
        const d = await res.json();
        toast({ title: "Ошибка", description: d.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка сети", variant: "destructive" });
    }
    setSavingCode(false);
  };

  const handleStartChat = async (bot: BotRecord) => {
    try {
      const res = await fetch("/api/chats/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getUserIdHeader() },
        body: JSON.stringify({ userId: bot.bot_user_id }),
      });
      if (res.ok) {
        const chat = await res.json();
        setLocation("/");
        setTimeout(() => {
          if (setSelectedChatId) setSelectedChatId(chat.id);
          else window.dispatchEvent(new CustomEvent("open-chat", { detail: chat.id }));
        }, 80);
      }
    } catch {
      toast({ title: "Ошибка открытия чата", variant: "destructive" });
    }
  };

  const downloadSdk = () => {
    const content = makePulseBotPy(host);
    const blob = new Blob([content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pulse_bot.py";
    a.click();
    toast({ title: "pulse_bot.py скачан", description: "Положите файл рядом со своим скриптом" });
  };

  const host = window.location.origin;
  const botSelected = selectedBot ? bots.find(b => b.bot_user_id === selectedBot.bot_user_id) || selectedBot : null;
  const firstToken = bots[0]?.token || "";
  const exampleCode = EXAMPLES[activeExample].code(firstToken, host);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background scrollbar-none">
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />

      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-900/40 via-indigo-900/30 to-background border-b border-border">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative px-6 pb-6" style={{ paddingTop: "max(2rem, calc(1.5rem + env(safe-area-inset-top, 0px)))" }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.4)]">
                <Bot size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-foreground">Aura</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Платформа для разработчиков ботов</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setActiveTab("bots")}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === "bots" ? "bg-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
              >
                Мои боты
              </button>
              <button
                onClick={() => setActiveTab("sdk")}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === "sdk" ? "bg-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
              >
                Внешний SDK
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <AnimatePresence mode="wait">

          {/* ── MY BOTS TAB ── */}
          {activeTab === "bots" && (
            <motion.div key="bots" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <motion.button
                whileHover={{ scale: 1.005, y: -1 }} whileTap={{ scale: 0.995 }}
                onClick={() => setShowCreate(true)}
                className="w-full flex items-center gap-4 p-4 bg-card border border-dashed border-violet-500/40 rounded-2xl hover:border-violet-500/70 hover:bg-violet-500/5 transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors shrink-0">
                  <Plus size={20} className="text-violet-400" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-foreground text-sm">Создать нового бота</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Получить токен и начать разработку</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
              </motion.button>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                    <RefreshCw size={24} className="text-muted-foreground" />
                  </motion.div>
                </div>
              ) : bots.length === 0 ? (
                <div className="text-center py-16 bg-card border border-border rounded-2xl">
                  <div className="w-16 h-16 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4">
                    <Bot size={32} className="text-muted-foreground opacity-50" />
                  </div>
                  <p className="font-bold text-foreground text-lg">Ботов пока нет</p>
                  <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">Создай своего первого бота и начни автоматизировать Aura</p>
                  <div className="flex items-center justify-center gap-3 mt-5">
                    <button
                      onClick={() => setShowCreate(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-500 hover:bg-violet-400 text-white rounded-xl font-semibold text-sm transition-colors shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                    >
                      <Plus size={16} /> Создать бота
                    </button>
                    <button
                      onClick={() => setActiveTab("sdk")}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-secondary hover:bg-secondary/70 rounded-xl font-semibold text-sm transition-colors text-foreground"
                    >
                      <BookOpen size={16} /> Python SDK
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {bots.map(bot => {
                    const isOpen = selectedBot?.bot_user_id === bot.bot_user_id;
                    return (
                    <motion.div
                      key={bot.bot_user_id}
                      layout
                      className={`rounded-2xl border overflow-hidden transition-all duration-200 ${isOpen ? "bg-card border-violet-500/30 shadow-[0_0_0_1px_rgba(139,92,246,0.15),0_8px_32px_rgba(0,0,0,0.2)]" : "bg-card border-border hover:border-border/80"}`}
                    >
                      {/* ── Collapsed header ── */}
                      <button
                        className="w-full flex items-center gap-4 px-5 py-4 text-left group"
                        onClick={() => setSelectedBot(prev => prev?.bot_user_id === bot.bot_user_id ? null : bot)}
                      >
                        {/* Avatar */}
                        <div
                          className="relative w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0 overflow-hidden cursor-pointer"
                          style={{ background: bot.avatar_color }}
                          onClick={(e) => { e.stopPropagation(); avatarUploadBotRef.current = bot.bot_user_id; avatarInputRef.current?.click(); }}
                        >
                          <span className="absolute inset-0 flex items-center justify-center">{bot.display_name[0]?.toUpperCase()}</span>
                          {bot.avatar_url && <img src={bot.avatar_url} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />}
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            {uploadingAvatar === bot.bot_user_id ? <RefreshCw size={14} className="text-white animate-spin" /> : <Camera size={14} className="text-white" />}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-sm truncate">{bot.display_name}</span>
                            <span className="shrink-0 text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-md bg-violet-500/15 text-violet-400 border border-violet-500/20">BOT</span>
                            {bot.inline_code && (
                              <span className="shrink-0 flex items-center gap-1 text-[9px] font-bold text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                LIVE
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">@{bot.username}{bot.bio ? ` · ${bot.bio}` : ""}</p>
                        </div>

                        {/* Actions hint + chevron */}
                        <div className="flex items-center gap-2 shrink-0">
                          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown size={16} className="text-muted-foreground/60" />
                          </motion.div>
                        </div>
                      </button>

                      {/* ── Expanded details ── */}
                      <AnimatePresence>
                        {isOpen && botSelected && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-border/60 mx-5" />
                            <div className="p-5 space-y-4">

                              {/* Inline code status banner */}
                              {bot.inline_code ? (
                                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-emerald-500/8 border border-emerald-500/20 rounded-xl">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                                    <div>
                                      <p className="text-xs font-semibold text-emerald-400">Встроенный Python-код активен</p>
                                      <p className="text-[11px] text-muted-foreground">Бот обрабатывает сообщения прямо на сервере</p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => { setCodeBot(bot); setCodeText(bot.inline_code || ""); }}
                                    className="shrink-0 text-xs font-semibold text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/50 px-3 py-1.5 rounded-lg transition-colors"
                                  >
                                    Изменить
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setCodeBot(bot); setCodeText(""); }}
                                  className="w-full flex items-center gap-3 px-4 py-3 bg-violet-500/6 hover:bg-violet-500/10 border border-violet-500/20 hover:border-violet-500/40 rounded-xl transition-all group/code text-left"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0 group-hover/code:bg-violet-500/20 transition-colors">
                                    <Code2 size={15} className="text-violet-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-foreground">Добавить встроенный Python-код</p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">Бот будет отвечать без внешнего сервера</p>
                                  </div>
                                  <ArrowRight size={14} className="text-muted-foreground/50 group-hover/code:text-violet-400 transition-colors shrink-0" />
                                </button>
                              )}

                              {/* Token row */}
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Токен API</p>
                                <div className="flex items-center gap-2 bg-muted/30 rounded-xl px-4 py-2.5 border border-border/50">
                                  <code className="flex-1 text-xs text-foreground font-mono break-all select-all leading-relaxed">
                                    {showToken[bot.bot_user_id] ? botSelected.token : "•".repeat(40)}
                                  </code>
                                  <div className="flex gap-0.5 shrink-0">
                                    <button onClick={() => setShowToken(p => ({ ...p, [bot.bot_user_id]: !p[bot.bot_user_id] }))} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                                      {showToken[bot.bot_user_id] ? <EyeOff size={13} className="text-muted-foreground" /> : <Eye size={13} className="text-muted-foreground" />}
                                    </button>
                                    <button onClick={() => copyText(botSelected.token, `token-${bot.bot_user_id}`)} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                                      {copied === `token-${bot.bot_user_id}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} className="text-muted-foreground" />}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Action buttons */}
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                <button
                                  onClick={() => handleStartChat(bot)}
                                  className="flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold transition-colors shadow-[0_4px_12px_rgba(255,80,0,0.2)]"
                                >
                                  <MessageCircle size={13} /> Написать боту
                                </button>
                                <button
                                  onClick={() => { setEditBot(bot); setEditName(bot.display_name); setEditDesc(bot.bio || ""); }}
                                  className="flex items-center justify-center gap-2 py-2.5 bg-secondary hover:bg-secondary/70 rounded-xl text-xs font-semibold text-foreground transition-colors"
                                >
                                  <Pencil size={13} /> Редактировать
                                </button>
                                <button
                                  onClick={() => handleRegenerate(bot)}
                                  disabled={regenerating === bot.bot_user_id}
                                  className="flex items-center justify-center gap-2 py-2.5 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 rounded-xl text-xs font-semibold text-amber-400 transition-colors disabled:opacity-50"
                                >
                                  <RefreshCw size={13} className={regenerating === bot.bot_user_id ? "animate-spin" : ""} /> Новый токен
                                </button>
                                <button
                                  onClick={() => handleDelete(bot)}
                                  disabled={deletingId === bot.bot_user_id}
                                  className="flex items-center justify-center gap-2 py-2.5 bg-destructive/8 hover:bg-destructive/15 border border-destructive/20 rounded-xl text-xs font-semibold text-destructive transition-colors disabled:opacity-50"
                                >
                                  <Trash2 size={13} /> Удалить бота
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ── EXTERNAL SDK TAB ── */}
          {activeTab === "sdk" && (
            <motion.div key="sdk" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

              {/* Inline code banner */}
              <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Code2 size={16} className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">Встроенный код проще</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Большинству ботов хватает встроенного редактора кода — Python запускается прямо на сервере, никаких зависимостей устанавливать не нужно.</p>
                  <button
                    onClick={() => setActiveTab("bots")}
                    className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    Перейти к встроенному коду <ArrowRight size={11} />
                  </button>
                </div>
              </div>

              {/* Step-by-step guide */}
              <div className="bg-gradient-to-br from-violet-500/10 to-indigo-500/5 border border-violet-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Zap size={16} className="text-violet-400" />
                  <h2 className="font-bold text-foreground text-base">Внешний Python SDK — для продвинутых сценариев</h2>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {STEPS.map((step, i) => (
                    <div key={step.num} className="flex gap-3">
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_12px_rgba(139,92,246,0.4)]">
                          {step.icon}
                        </div>
                        {i < STEPS.length - 1 && (
                          <div className="w-px flex-1 bg-gradient-to-b from-violet-500/40 to-transparent mt-1" />
                        )}
                      </div>
                      <div className="pb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black text-violet-400 uppercase tracking-wider">Шаг {step.num}</span>
                        </div>
                        <p className="font-bold text-foreground text-sm mb-1">{step.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Download button */}
                <div className="mt-4 pt-4 border-t border-violet-500/20 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-foreground text-sm">pulse_bot.py</p>
                    <p className="text-xs text-muted-foreground">Для ботов с внешним сервером · pip install requests</p>
                  </div>
                  <button
                    onClick={downloadSdk}
                    className="flex items-center gap-2 px-5 py-2.5 bg-violet-500 hover:bg-violet-400 text-white rounded-xl text-sm font-bold transition-colors shadow-[0_0_15px_rgba(139,92,246,0.3)] shrink-0"
                  >
                    <Download size={14} /> Скачать SDK
                  </button>
                </div>
              </div>

              {/* Code examples */}
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                {/* Example selector tabs */}
                <div className="flex items-center gap-1 p-3 border-b border-border bg-muted/30 overflow-x-auto">
                  <span className="text-xs font-semibold text-muted-foreground mr-2 shrink-0">Примеры:</span>
                  {(Object.keys(EXAMPLES) as Array<keyof typeof EXAMPLES>).map(key => {
                    const ex = EXAMPLES[key];
                    return (
                      <button
                        key={key}
                        onClick={() => setActiveExample(key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                          activeExample === key
                            ? "bg-violet-500 text-white shadow-[0_0_10px_rgba(139,92,246,0.3)]"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                        }`}
                      >
                        {ex.icon} {ex.label}
                      </button>
                    );
                  })}
                </div>

                {/* Example description */}
                <div className="px-4 py-2.5 border-b border-border/60 flex items-center justify-between bg-[#0d1117]/60">
                  <span className="text-xs text-white/50">{EXAMPLES[activeExample].desc}</span>
                  <span className="text-[10px] text-white/30 font-mono">my_bot.py</span>
                </div>

                {/* Code block */}
                <div className="relative bg-[#0d1117]">
                  <button
                    onClick={() => copyText(exampleCode, "example")}
                    className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-white/60 hover:text-white/90 transition-colors z-10"
                  >
                    {copied === "example" ? <><Check size={11} className="text-green-400" /> Скопировано</> : <><Copy size={11} /> Скопировать</>}
                  </button>
                  <AnimatePresence mode="wait">
                    <motion.pre
                      key={activeExample}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="text-sm text-green-300 font-mono whitespace-pre leading-relaxed p-5 overflow-x-auto"
                    >
                      {exampleCode}
                    </motion.pre>
                  </AnimatePresence>
                </div>

                {/* Run hint */}
                <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center gap-2">
                  <Terminal size={13} className="text-muted-foreground shrink-0" />
                  <code className="text-xs text-muted-foreground font-mono">pip install requests</code>
                  <span className="text-muted-foreground/40 text-xs">·</span>
                  <code className="text-xs text-muted-foreground font-mono">python my_bot.py</code>
                  {firstToken && (
                    <>
                      <span className="text-muted-foreground/40 text-xs">·</span>
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={11} /> токен подставлен автоматически
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Two-column: API reference + Decorators */}
              <div className="grid grid-cols-2 gap-5">
                {/* API Methods */}
                <div className="bg-card rounded-2xl border border-border p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Code2 size={15} className="text-primary" />
                    <p className="font-bold text-base text-foreground">Методы API</p>
                  </div>
                  <div className="space-y-0">
                    {API_METHODS.map(m => (
                      <div key={m.method} className="flex items-start gap-2 py-2 border-b border-border/50 last:border-0">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                          m.type === "GET" ? "bg-green-500/15 text-green-400" :
                          m.type === "POST" ? "bg-blue-500/15 text-blue-400" :
                          "bg-violet-500/15 text-violet-400"
                        }`}>
                          {m.type === "Хелпер" ? "✦" : m.type}
                        </span>
                        <div className="min-w-0">
                          <code className="text-xs font-mono text-primary block leading-tight">{m.method}</code>
                          <span className="text-[11px] text-muted-foreground">{m.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Decorators + helpers */}
                <div className="bg-card rounded-2xl border border-border p-5 space-y-5">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Hash size={15} className="text-emerald-400" />
                      <p className="font-bold text-base text-foreground">Декораторы</p>
                    </div>
                    <div className="space-y-3">
                      {[
                        { dec: '@bot.command("/start")', desc: 'Обработать команду /start' },
                        { dec: '@bot.message_handler()', desc: 'Все входящие сообщения' },
                        { dec: '@bot.message_handler(func=...)', desc: 'Сообщения с условием-фильтром' },
                        { dec: '@bot.callback_handler(data="ok")', desc: 'Нажатие кнопки с data="ok"' },
                        { dec: '@bot.callback_handler()', desc: 'Любое нажатие кнопки' },
                      ].map(d => (
                        <div key={d.dec} className="bg-muted/40 rounded-xl px-3 py-2.5">
                          <code className="text-xs font-mono text-violet-300 block">{d.dec}</code>
                          <span className="text-[11px] text-muted-foreground">{d.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Keyboard size={15} className="text-amber-400" />
                      <p className="font-bold text-sm text-foreground">Создание клавиатуры</p>
                    </div>
                    <div className="bg-[#0d1117] rounded-xl p-3 overflow-x-auto">
                      <pre className="text-xs text-green-300 font-mono whitespace-pre leading-relaxed">{`from pulse_bot import inline_keyboard, btn, row

kb = inline_keyboard(
    row(btn("Да", data="yes"),
        btn("Нет", data="no")),
    row(btn("Сайт", url="https://..."))
)
bot.send_message(chat_id, "Выбери:", reply_markup=kb)`}</pre>
                    </div>
                  </div>
                </div>
              </div>

              {/* Webhook section */}
              <div className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Webhook size={15} className="text-violet-400" />
                  <p className="font-bold text-foreground">Webhook-режим</p>
                  <span className="text-xs bg-violet-500/15 text-violet-400 px-2 py-0.5 rounded-full">Продвинутый</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Вместо polling Aura может отправлять обновления на ваш сервер мгновенно.
                  Нужен публичный HTTPS-сервер (например, ngrok для разработки).
                </p>
                <div className="bg-[#0d1117] rounded-xl p-4 overflow-x-auto">
                  <pre className="text-xs text-green-300 font-mono whitespace-pre leading-relaxed">{`import pulse_bot
from flask import Flask, request

app = Flask(__name__)
bot = pulse_bot.Bot("${firstToken || 'ВАШ_ТОКЕН'}")

@bot.command("/start")
def on_start(msg):
    bot.reply(msg, "Привет! Я работаю через webhook 🔗")

@app.route("/webhook", methods=["POST"])
def webhook():
    update = request.get_json()
    bot.process_update(update)  # обработать обновление вручную
    return "ok"

if __name__ == "__main__":
    # Установить webhook один раз
    bot.set_webhook("https://ВАШ_СЕРВЕР.ngrok.io/webhook")
    app.run(port=5000)`}</pre>
                </div>
                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                  <Terminal size={12} />
                  <code>pip install flask pulse_bot</code>
                  <span className="text-muted-foreground/40">·</span>
                  <span>В режиме разработки: <code className="font-mono">ngrok http 5000</code></span>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Bot Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}
          >
            <motion.div initial={{ y: 48, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 24, opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="bg-card rounded-2xl border border-violet-500/20 shadow-[0_24px_80px_rgba(0,0,0,0.5),0_0_0_1px_rgba(139,92,246,0.1)] w-full max-w-md overflow-hidden"
            >
              {/* Modal header */}
              <div className="relative px-6 pt-6 pb-5 border-b border-border/60">
                <div className="flex items-center gap-3 mb-0.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-[0_0_16px_rgba(139,92,246,0.35)]">
                    <Bot size={18} className="text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-foreground text-base leading-tight">Создать бота</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Новый бот для автоматизации чатов</p>
                  </div>
                </div>
                <button onClick={() => setShowCreate(false)} className="absolute top-5 right-5 p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                  <X size={16} />
                </button>
              </div>

              {/* Fields */}
              <div className="px-6 py-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider block">Имя бота</label>
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Мой Бот"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider block">
                    Username <span className="normal-case font-normal text-muted-foreground/50 tracking-normal">· должен заканчиваться на «bot»</span>
                  </label>
                  <div className="flex items-center gap-0 bg-background border border-border rounded-xl overflow-hidden focus-within:border-violet-500/60 focus-within:ring-1 focus-within:ring-violet-500/20 transition-all">
                    <span className="text-muted-foreground text-sm px-4 border-r border-border py-2.5 bg-muted/30 shrink-0">@</span>
                    <input value={newUsername} onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      placeholder="myawesomebot"
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none px-3 py-2.5"
                    />
                  </div>
                  {newUsername && !/bot$/i.test(newUsername) && (
                    <p className="text-[11px] text-amber-400 flex items-center gap-1"><span>⚠</span> Username должен заканчиваться на «bot»</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider block">
                    Описание <span className="normal-case font-normal text-muted-foreground/50 tracking-normal">· необязательно</span>
                  </label>
                  <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Что умеет ваш бот..." rows={2}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 transition-all resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-2 px-6 pb-6">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl bg-secondary hover:bg-secondary/70 text-sm font-medium text-muted-foreground transition-colors">
                  Отмена
                </button>
                <button onClick={handleCreate} disabled={creating || !newName.trim() || !/bot$/i.test(newUsername)}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-40 shadow-[0_4px_14px_rgba(139,92,246,0.3)]"
                >
                  {creating ? "Создаём..." : "Создать бота"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline Code Editor Modal */}
      <AnimatePresence>
        {codeBot && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setCodeBot(null); }}
          >
            <motion.div initial={{ y: 48, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 24, opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="bg-card rounded-2xl border border-emerald-500/20 shadow-[0_24px_80px_rgba(0,0,0,0.6),0_0_0_1px_rgba(52,211,153,0.08)] w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden"
            >
              {/* Header */}
              <div className="relative flex items-center gap-3 px-5 py-4 border-b border-border/60 shrink-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Code2 size={16} className="text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-foreground text-sm">Встроенный Python-код</h2>
                    <span className="text-xs text-muted-foreground font-mono bg-muted/40 px-2 py-0.5 rounded-lg">@{codeBot.username}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Выполняется на сервере · используйте <code className="font-mono text-emerald-400 text-[11px]">print()</code> для отправки ответа</p>
                </div>
                <button onClick={() => setCodeBot(null)} className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground shrink-0"><X size={15} /></button>
              </div>

              {/* Variables reference */}
              <div className="px-5 py-3 bg-[#0d1117]/80 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider shrink-0">Переменные:</span>
                  {[
                    { name: "text", type: "str", desc: "текст сообщения" },
                    { name: "chat_id", type: "int", desc: "id чата" },
                    { name: "sender", type: "dict", desc: "{id, username, first_name}" },
                    { name: "message", type: "dict", desc: "полный объект Update" },
                  ].map(v => (
                    <span key={v.name} className="flex items-center gap-1.5 text-[11px] font-mono">
                      <span className="text-sky-400">{v.name}</span>
                      <span className="text-white/20">:</span>
                      <span className="text-amber-300/70">{v.type}</span>
                      <span className="text-white/25 font-sans text-[10px]">— {v.desc}</span>
                    </span>
                  ))}
                  <span className="flex items-center gap-1 text-[11px] font-mono ml-auto">
                    <span className="text-purple-400">print</span>
                    <span className="text-white/40">(…)</span>
                    <span className="text-white/25 font-sans text-[10px]">→ ответ бота</span>
                  </span>
                </div>
              </div>

              {/* Editor */}
              <div className="flex-1 overflow-hidden bg-[#0d1117] relative">
                <div className="absolute top-0 left-0 w-10 h-full border-r border-white/5 flex flex-col pt-4 select-none" aria-hidden>
                  {Array.from({ length: Math.max(12, (codeText.split("\n").length + 2)) }).map((_, i) => (
                    <span key={i} className="text-[11px] text-white/15 font-mono text-right pr-3 leading-[1.625rem]">{i + 1}</span>
                  ))}
                </div>
                <textarea
                  value={codeText}
                  onChange={e => setCodeText(e.target.value)}
                  spellCheck={false}
                  placeholder={`# Пример: эхо-бот\nif text:\n    print(f"Вы написали: {text}")\nelse:\n    print("Привет! Напишите что-нибудь.")`}
                  className="w-full h-full min-h-[260px] bg-transparent text-emerald-300 font-mono text-sm pl-12 pr-5 pt-4 pb-4 focus:outline-none resize-none leading-[1.625rem] placeholder:text-white/15"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center gap-2 px-5 py-4 border-t border-border/60 bg-card shrink-0">
                {codeText.trim() && (
                  <button onClick={() => setCodeText("")} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-destructive/25 text-destructive text-xs font-semibold hover:bg-destructive/8 transition-colors">
                    <Trash2 size={12} /> Очистить
                  </button>
                )}
                <button onClick={() => setCodeBot(null)} className="flex-1 py-2 rounded-xl bg-secondary hover:bg-secondary/70 text-sm font-medium text-muted-foreground transition-colors">
                  Отмена
                </button>
                <button onClick={handleSaveCode} disabled={savingCode}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-[0_4px_14px_rgba(52,211,153,0.25)]"
                >
                  {savingCode ? "Сохраняем..." : "Активировать код"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Bot Modal */}
      <AnimatePresence>
        {editBot && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setEditBot(null); }}
          >
            <motion.div initial={{ y: 48, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 24, opacity: 0, scale: 0.97 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              className="bg-card rounded-2xl border border-border shadow-[0_24px_80px_rgba(0,0,0,0.5)] w-full max-w-md overflow-hidden"
            >
              <div className="relative flex items-center gap-3 px-6 py-5 border-b border-border/60">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-base shrink-0" style={{ background: editBot.avatar_color }}>
                  {editBot.avatar_url ? <img src={editBot.avatar_url} alt="" className="w-full h-full object-cover rounded-xl" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} /> : editBot.display_name[0]?.toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-foreground text-sm leading-tight">Редактировать бота</h2>
                  <p className="text-xs text-muted-foreground">@{editBot.username}</p>
                </div>
                <button onClick={() => setEditBot(null)} className="absolute top-4 right-4 p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground"><X size={16} /></button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider block">Имя бота</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider block">Описание</label>
                  <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 px-6 pb-6">
                <button onClick={() => setEditBot(null)} className="flex-1 py-2.5 rounded-xl bg-secondary hover:bg-secondary/70 text-sm font-medium text-muted-foreground transition-colors">
                  Отмена
                </button>
                <button onClick={handleEdit} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all shadow-[0_4px_12px_rgba(255,80,0,0.2)]">
                  Сохранить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
