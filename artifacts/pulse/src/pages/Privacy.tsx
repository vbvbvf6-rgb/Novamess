import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Shield, Globe } from "lucide-react";

export default function Privacy() {
  const [, navigate] = useLocation();
  const [lang, setLang] = useState<"en" | "ru">(() =>
    navigator.language.startsWith("ru") ? "ru" : "en"
  );

  const updated = "June 20, 2026 / 20 июня 2026";

  const t = {
    title: { en: "Privacy Policy", ru: "Политика конфиденциальности" },
    updated: { en: "Last updated", ru: "Последнее обновление" },
    intro: {
      en: 'This Privacy Policy describes how Aura Messenger ("Aura", "we", "us") collects, uses, stores, and protects your personal information. Aura is a global service — this policy complies with GDPR (EU), CCPA (California), and other applicable international privacy frameworks.',
      ru: "Настоящая Политика конфиденциальности описывает, как Aura Messenger («Aura», «мы») собирает, использует, хранит и защищает вашу персональную информацию. Aura — глобальный сервис; настоящая политика соответствует GDPR (ЕС), CCPA (Калифорния), ФЗ-152 (Россия) и другим применимым международным стандартам.",
    },
  };

  const sections = [
    {
      id: "1",
      en: { title: "Data Controller", body: "Aura Messenger operates as the data controller for information you provide when using the Service. Contact us through the in-app Support section for any data-related inquiries." },
      ru: { title: "Оператор данных", body: "Aura Messenger выступает оператором данных в отношении информации, предоставленной вами при использовании Сервиса. По вопросам обработки данных обращайтесь через раздел «Поддержка» в приложении." },
    },
    {
      id: "2",
      en: {
        title: "Data We Collect",
        list: [
          "Account data: username, display name, avatar, bio, status.",
          "Message content: text and media you send through the Service.",
          "Technical data: IP address, User-Agent string, session timestamps.",
          "Usage data: call history, gifts sent/received, reactions.",
          "Security data: hashed password (bcrypt), 2FA secret (if enabled).",
        ],
        note: "We do not collect government IDs, passport numbers, payment card data, or any information that physically identifies a person beyond what you voluntarily provide.",
      },
      ru: {
        title: "Какие данные мы собираем",
        list: [
          "Данные аккаунта: никнейм, отображаемое имя, аватар, биография, статус.",
          "Содержимое сообщений: тексты и медиафайлы, отправляемые через Сервис.",
          "Технические данные: IP-адрес, User-Agent, время сессий.",
          "Данные об активности: история звонков, подарки, реакции.",
          "Данные безопасности: хеш пароля (bcrypt), секрет 2FA (при включении).",
        ],
        note: "Мы не собираем паспортные данные, СНИЛС, данные банковских карт и иные сведения, позволяющие физически идентифицировать личность, помимо добровольно предоставленных вами.",
      },
    },
    {
      id: "3",
      en: {
        title: "Legal Basis & Purpose",
        list: [
          "Contract performance — to provide messaging, calls, and other core features.",
          "Legitimate interest — to detect abuse, fraud, and security threats.",
          "Legal obligation — to comply with applicable laws in jurisdictions we serve.",
          "Consent — for optional features you explicitly enable.",
        ],
      },
      ru: {
        title: "Правовое основание и цели обработки",
        list: [
          "Исполнение договора — для предоставления функций переписки, звонков и т.д.",
          "Законный интерес — для обнаружения злоупотреблений и угроз безопасности.",
          "Юридическое обязательство — для соответствия применимым законам.",
          "Согласие — для дополнительных функций, которые вы явно включаете.",
        ],
      },
    },
    {
      id: "4",
      en: {
        title: "Data Retention",
        body: "Your data is stored for as long as your account remains active. Upon account deletion, all personal data is immediately purged from our systems. Aggregate, anonymized statistics may be retained indefinitely.",
      },
      ru: {
        title: "Срок хранения данных",
        body: "Ваши данные хранятся до тех пор, пока ваш аккаунт активен. При удалении аккаунта все персональные данные немедленно уничтожаются. Обезличенная агрегированная статистика может храниться бессрочно.",
      },
    },
    {
      id: "5",
      en: {
        title: "International Data Transfers",
        body: "Aura may store data on servers in multiple countries. Regardless of where data is processed, we apply the same privacy protections described in this policy. By using Aura, you consent to your data being processed in countries that may have different privacy laws than your own.",
      },
      ru: {
        title: "Международная передача данных",
        body: "Aura может хранить данные на серверах в разных странах. Независимо от места обработки мы применяем единые стандарты защиты, описанные в настоящей Политике. Используя Aura, вы соглашаетесь на обработку данных в странах с иными законами о конфиденциальности.",
      },
    },
    {
      id: "6",
      en: {
        title: "Third-Party Sharing",
        body: "We do not sell your personal data. We may share data with trusted service providers acting as processors under strict confidentiality agreements, or when legally required by competent authorities.",
      },
      ru: {
        title: "Передача данных третьим лицам",
        body: "Мы не продаём ваши персональные данные. Мы можем передавать данные доверенным поставщикам услуг на основании договоров о конфиденциальности, а также в случаях, предусмотренных применимым законодательством.",
      },
    },
    {
      id: "7",
      en: {
        title: "Your Rights",
        list: [
          "Access — request a copy of your data (Settings → Privacy → Download My Data).",
          "Rectification — correct inaccurate profile information at any time.",
          'Erasure ("Right to be Forgotten") — permanently delete your account and all data (Settings → Privacy → Delete Account).',
          "Portability — download your data in machine-readable JSON format.",
          "Restriction & Objection — limit how we process your data via Privacy settings.",
          "Withdrawal of consent — disable optional features at any time.",
        ],
        note: "EU/EEA residents may also lodge a complaint with their national Data Protection Authority. California residents have additional rights under CCPA.",
      },
      ru: {
        title: "Ваши права",
        list: [
          "Доступ — запросить копию данных (Настройки → Конфиденциальность → Скачать данные).",
          "Исправление — изменить неточные данные в профиле в любое время.",
          "Удаление («право на забвение») — полное удаление аккаунта и всех данных (Настройки → Конфиденциальность → Удалить аккаунт).",
          "Переносимость — скачать данные в машиночитаемом формате JSON.",
          "Ограничение и возражение — ограничить обработку данных через настройки конфиденциальности.",
          "Отзыв согласия — отключить дополнительные функции в любое время.",
        ],
        note: "Жители ЕС/ЕЭЗ вправе подать жалобу в национальный орган по защите данных. Жители РФ могут обратиться в Роскомнадзор. Жители Калифорнии имеют дополнительные права по CCPA.",
      },
    },
    {
      id: "8",
      en: {
        title: "Security Measures",
        list: [
          "Passwords hashed with bcrypt (SALT_ROUNDS=12) — never stored in plaintext.",
          "JWT tokens with 30-day expiry for session management.",
          "Two-factor authentication (TOTP/2FA) available to all users.",
          "Brute-force protection: account lock after 10 failed login attempts.",
          "Rate limiting on all sensitive API endpoints.",
          "HTTP security headers: HSTS, CSP, X-Frame-Options, X-Content-Type-Options.",
          "Active session management — view and revoke sessions from any device.",
        ],
      },
      ru: {
        title: "Меры безопасности",
        list: [
          "Пароли хешируются bcrypt (SALT_ROUNDS=12) — никогда не хранятся в открытом виде.",
          "JWT-токены со сроком действия 30 дней для управления сессиями.",
          "Двухфакторная аутентификация (TOTP/2FA) доступна всем пользователям.",
          "Защита от перебора: блокировка аккаунта после 10 неудачных попыток входа.",
          "Ограничение частоты запросов на всех критичных API-эндпоинтах.",
          "HTTP-заголовки безопасности: HSTS, CSP, X-Frame-Options, X-Content-Type-Options.",
          "Управление активными сессиями — просмотр и завершение сессий с любого устройства.",
        ],
      },
    },
    {
      id: "9",
      en: {
        title: "Cookies & Local Storage",
        body: "Aura uses browser localStorage and sessionStorage to store your authentication token and user preferences. We do not use third-party tracking cookies or advertising trackers.",
      },
      ru: {
        title: "Файлы cookie и локальное хранилище",
        body: "Aura использует localStorage и sessionStorage браузера для хранения токена авторизации и пользовательских настроек. Мы не используем сторонние трекинговые cookie и рекламные трекеры.",
      },
    },
    {
      id: "10",
      en: {
        title: "Content Moderation",
        body: "To maintain a safe environment and comply with applicable laws, Aura may review public posts for policy violations. Private direct messages are not automatically scanned.",
      },
      ru: {
        title: "Модерация контента",
        body: "Для обеспечения безопасной среды и соблюдения применимого законодательства Aura может проверять публичные публикации на соответствие правилам. Личные сообщения не проверяются автоматически.",
      },
    },
    {
      id: "11",
      en: {
        title: "Children's Privacy",
        body: "Aura is not directed to children under 16. We do not knowingly collect personal information from children under 16. If you believe a child has provided us data without parental consent, please contact us immediately.",
      },
      ru: {
        title: "Конфиденциальность детей",
        body: "Aura не предназначена для лиц младше 16 лет. Мы не собираем намеренно персональные данные детей до 16 лет. Если вы считаете, что ребёнок предоставил нам данные без согласия родителей, немедленно свяжитесь с нами.",
      },
    },
    {
      id: "12",
      en: {
        title: "Changes to This Policy",
        body: "We may update this Privacy Policy. For material changes, we will notify you in-app at least 7 days before the changes take effect. Continued use after that date constitutes acceptance.",
      },
      ru: {
        title: "Изменения Политики",
        body: "Мы можем обновлять настоящую Политику. О существенных изменениях мы уведомим в приложении не менее чем за 7 дней до вступления в силу. Продолжение использования Сервиса означает принятие изменений.",
      },
    },
    {
      id: "13",
      en: {
        title: "Contact & Compliance",
        body: "For privacy inquiries, data subject requests, or to report a violation, contact us through the in-app Support section. We aim to respond within 30 days.",
        note: "Applicable frameworks: GDPR (EU/EEA), UK GDPR, CCPA/CPRA (California), Federal Law No. 152-FZ (Russia), PIPEDA (Canada), PDPA (Thailand/Singapore), and other applicable national data protection laws.",
      },
      ru: {
        title: "Контакты и применимые нормы",
        body: "По вопросам конфиденциальности, запросам субъектов данных и жалобам обращайтесь через раздел «Поддержка» в приложении. Мы стремимся отвечать в течение 30 дней.",
        note: "Применимые нормы: GDPR (ЕС/ЕЭЗ), UK GDPR, CCPA/CPRA (Калифорния), ФЗ-152 (Россия), PIPEDA (Канада), PDPA (Таиланд/Сингапур) и иные национальные законы о защите данных.",
      },
    },
  ];

  const l = lang;

  return (
    <div className="absolute inset-0 overflow-y-auto bg-background text-foreground">
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border/40 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1 as any)} className="p-2 rounded-xl hover:bg-muted/60 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <Shield size={18} className="text-primary" />
        <h1 className="text-base font-semibold flex-1">{t.title[l]}</h1>
        <button
          onClick={() => setLang(l === "en" ? "ru" : "en")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 hover:bg-muted text-xs font-semibold transition-colors"
        >
          <Globe size={13} />
          {l === "en" ? "RU" : "EN"}
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 text-sm leading-relaxed">
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl">
          <p className="text-xs text-muted-foreground">{t.updated[l]}: {updated}</p>
          <p className="mt-1 font-medium">{t.intro[l]}</p>
        </div>

        {/* Compliance badges */}
        <div className="flex flex-wrap gap-2">
          {["GDPR", "CCPA", "UK GDPR", "152-ФЗ", "PIPEDA"].map(badge => (
            <span key={badge} className="px-2.5 py-1 bg-primary/8 border border-primary/20 rounded-lg text-xs font-semibold text-primary">{badge}</span>
          ))}
        </div>

        {sections.map(s => {
          const sec = s[l];
          return (
            <section key={s.id} className="space-y-2">
              <h2 className="font-semibold text-base">{s.id}. {sec.title}</h2>
              {"body" in sec && <p className="text-muted-foreground">{(sec as any).body}</p>}
              {"list" in sec && (
                <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                  {(sec as any).list.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
              {"note" in sec && (sec as any).note && (
                <p className="text-xs text-muted-foreground/80 italic border-l-2 border-primary/30 pl-3">{(sec as any).note}</p>
              )}
            </section>
          );
        })}

        <div className="p-4 bg-muted/40 rounded-2xl text-xs text-muted-foreground">
          {l === "en"
            ? "This Privacy Policy is effective globally. Aura complies with applicable data protection laws in the jurisdictions where it operates."
            : "Настоящая Политика конфиденциальности действует глобально. Aura соответствует применимым законам о защите данных в юрисдикциях, в которых работает."}
        </div>
      </div>
    </div>
  );
}
