import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, FileText, Globe } from "lucide-react";

export default function Terms() {
  const [, navigate] = useLocation();
  const [lang, setLang] = useState<"en" | "ru">(() =>
    navigator.language.startsWith("ru") ? "ru" : "en"
  );

  const updated = "June 20, 2026 / 20 июня 2026";

  const t = {
    title: { en: "Terms of Service", ru: "Пользовательское соглашение" },
    updated: { en: "Last updated", ru: "Последнее обновление" },
    intro: {
      en: 'These Terms of Service govern your use of Aura Messenger ("Aura", "Service"). By registering or using Aura, you agree to these Terms. Aura is a global service available worldwide.',
      ru: "Настоящее Пользовательское соглашение регулирует использование мессенджера Aura. Регистрируясь или используя Aura, вы принимаете условия настоящего Соглашения. Aura — глобальный сервис, доступный по всему миру.",
    },
  };

  const sections = [
    {
      id: "1",
      en: {
        title: "Acceptance of Terms",
        body: 'By creating an account, you confirm you are at least 16 years old (or have parental consent if under 18 in your jurisdiction) and that you have read and agree to these Terms and our Privacy Policy. If you disagree, do not use the Service.',
      },
      ru: {
        title: "Принятие условий",
        body: "Создавая аккаунт, вы подтверждаете, что вам не менее 16 лет (или имеется согласие родителей в случаях, предусмотренных законодательством вашей страны), и что вы прочитали и принимаете настоящее Соглашение и Политику конфиденциальности. Если вы не согласны — не используйте Сервис.",
      },
    },
    {
      id: "2",
      en: {
        title: "Description of Service",
        body: "Aura is a global instant messenger offering text and media messaging, voice and video calls, group chats, channels, stories, and related features. The Service is provided \"as is\" without warranties of uninterrupted availability.",
      },
      ru: {
        title: "Описание Сервиса",
        body: "Aura — глобальный мессенджер для обмена текстовыми и медиасообщениями, голосовых и видеозвонков, групп, каналов, историй и сопутствующих функций. Сервис предоставляется «как есть» без гарантий бесперебойной доступности.",
      },
    },
    {
      id: "3",
      en: {
        title: "Prohibited Conduct",
        intro: "You may not use Aura to:",
        list: [
          "Distribute content that is illegal under applicable law in your jurisdiction or ours.",
          "Promote, glorify, or incite violence, terrorism, or extremism.",
          "Distribute child sexual abuse material (CSAM) or content that sexually exploits minors.",
          "Harass, stalk, threaten, or intimidate other users.",
          "Distribute malware, spyware, or engage in phishing or fraud.",
          "Send unsolicited bulk messages (spam).",
          "Infringe on intellectual property rights of third parties.",
          "Attempt unauthorized access to other users' accounts or Aura's infrastructure.",
          "Engage in automated or bot activity without explicit permission.",
          "Violate any applicable local, national, or international law.",
        ],
      },
      ru: {
        title: "Запрещённые действия",
        intro: "Вам запрещено использовать Aura для:",
        list: [
          "Распространения контента, незаконного по применимым законам вашей юрисдикции или нашей.",
          "Пропаганды, прославления или подстрекательства к насилию, терроризму, экстремизму.",
          "Распространения материалов сексуального насилия над детьми (CSAM).",
          "Домогательств, преследования, угроз или запугивания других пользователей.",
          "Распространения вредоносного ПО, шпионских программ или фишинга.",
          "Массовой рассылки нежелательных сообщений (спам).",
          "Нарушения интеллектуальных прав третьих лиц.",
          "Попыток несанкционированного доступа к аккаунтам или инфраструктуре Aura.",
          "Автоматизированной активности или ботов без явного разрешения.",
          "Нарушения любых применимых местных, национальных или международных законов.",
        ],
      },
    },
    {
      id: "4",
      en: {
        title: "User Content",
        body: "You are solely responsible for all content you post or transmit through Aura. By submitting content, you warrant that you own or have the right to share it, and that it does not violate these Terms or any applicable law. Aura does not endorse user-generated content.",
      },
      ru: {
        title: "Контент пользователей",
        body: "Вы несёте полную ответственность за весь контент, публикуемый или передаваемый через Aura. Размещая контент, вы гарантируете, что владеете им или имеете право им делиться, и что он не нарушает настоящее Соглашение или применимые законы. Aura не несёт ответственности за пользовательский контент.",
      },
    },
    {
      id: "5",
      en: {
        title: "Account Security",
        list: [
          "You are responsible for maintaining the confidentiality of your credentials.",
          "Do not share your password or access tokens with anyone.",
          "Notify us immediately through Support if you detect unauthorized access.",
          "One natural person per account; mass account creation is prohibited.",
          "We recommend enabling two-factor authentication (2FA) for additional security.",
        ],
      },
      ru: {
        title: "Безопасность аккаунта",
        list: [
          "Вы несёте ответственность за конфиденциальность учётных данных.",
          "Не передавайте пароль или токены третьим лицам.",
          "Немедленно уведомляйте нас через Поддержку при обнаружении несанкционированного доступа.",
          "Один аккаунт — один реальный человек; массовое создание аккаунтов запрещено.",
          "Рекомендуем включить двухфакторную аутентификацию (2FA).",
        ],
      },
    },
    {
      id: "6",
      en: {
        title: "Content Moderation & Enforcement",
        body: "Aura reserves the right to remove content that violates these Terms and to suspend or terminate accounts of users who repeatedly violate our policies. In serious cases (e.g., CSAM, terrorism), we will report to appropriate law enforcement authorities.",
      },
      ru: {
        title: "Модерация и правоприменение",
        body: "Aura оставляет за собой право удалять контент, нарушающий настоящее Соглашение, а также приостанавливать или удалять аккаунты нарушителей. В серьёзных случаях (например, CSAM, терроризм) Aura передаёт информацию в компетентные правоохранительные органы.",
      },
    },
    {
      id: "7",
      en: {
        title: "Account Deletion",
        body: "You may delete your account at any time from Settings → Privacy → Delete Account. Upon deletion, all your personal data (messages, call history, gifts, contacts) will be permanently erased from our systems.",
      },
      ru: {
        title: "Удаление аккаунта",
        body: "Вы можете удалить аккаунт в любое время через Настройки → Конфиденциальность → Удалить аккаунт. После удаления все ваши персональные данные (сообщения, история звонков, подарки, контакты) будут навсегда уничтожены в наших системах.",
      },
    },
    {
      id: "8",
      en: {
        title: "Intellectual Property",
        body: "Aura and its design, code, and branding are owned by the Service operator. You receive a limited, non-exclusive, non-transferable license to use the Service for personal, non-commercial purposes. You retain ownership of content you create.",
      },
      ru: {
        title: "Интеллектуальная собственность",
        body: "Aura, её дизайн, код и бренд принадлежат оператору Сервиса. Вам предоставляется ограниченная, неисключительная, непередаваемая лицензия на использование Сервиса в личных некоммерческих целях. Права на созданный вами контент остаются за вами.",
      },
    },
    {
      id: "9",
      en: {
        title: "Disclaimer & Limitation of Liability",
        body: "The Service is provided \"as is\". To the maximum extent permitted by law, Aura disclaims all warranties and shall not be liable for indirect, incidental, or consequential damages. Aura's liability shall not exceed the amount you paid for the Service (if any) in the 12 months prior to the claim.",
      },
      ru: {
        title: "Отказ от гарантий и ограничение ответственности",
        body: "Сервис предоставляется «как есть». В максимальной степени, допустимой применимым правом, Aura отказывается от любых гарантий и не несёт ответственности за косвенные, случайные или последующие убытки. Ответственность Aura ограничена суммой, уплаченной вами за Сервис (если таковая имеется) за 12 месяцев до предъявления требования.",
      },
    },
    {
      id: "10",
      en: {
        title: "Governing Law & Disputes",
        body: "These Terms are governed by applicable international law and the laws of the jurisdiction where the Service operator is established. For users in the EU/EEA, mandatory consumer protection laws of your country of residence apply. Disputes should first be addressed through our Support channel.",
      },
      ru: {
        title: "Применимое право и споры",
        body: "Настоящее Соглашение регулируется международным правом и законодательством юрисдикции, в которой зарегистрирован оператор Сервиса. Для пользователей из ЕС/ЕЭЗ применяются обязательные нормы потребительской защиты страны их проживания. Споры следует сначала урегулировать через нашу Поддержку.",
      },
    },
    {
      id: "11",
      en: {
        title: "Changes to Terms",
        body: "We may modify these Terms. For material changes, we will notify you in-app at least 7 days before the new Terms take effect (except for changes required immediately for security or legal reasons). Continued use after that date means you accept the revised Terms.",
      },
      ru: {
        title: "Изменения Соглашения",
        body: "Мы вправе изменять настоящее Соглашение. О существенных изменениях мы уведомим в приложении не менее чем за 7 дней до вступления их в силу (кроме случаев, требующих немедленных изменений из соображений безопасности или права). Продолжение использования Сервиса означает согласие с обновлённым Соглашением.",
      },
    },
    {
      id: "12",
      en: {
        title: "Contact",
        body: "For any questions about these Terms, please use the in-app Support section. We aim to respond within 30 days.",
      },
      ru: {
        title: "Контакты",
        body: "По любым вопросам, связанным с настоящим Соглашением, обращайтесь через раздел «Поддержка» в приложении. Мы стремимся отвечать в течение 30 дней.",
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
        <FileText size={18} className="text-primary" />
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

        {sections.map(s => {
          const sec = s[l];
          return (
            <section key={s.id} className="space-y-2">
              <h2 className="font-semibold text-base">{s.id}. {sec.title}</h2>
              {"intro" in sec && (sec as any).intro && (
                <p className="font-medium text-destructive">{(sec as any).intro}</p>
              )}
              {"body" in sec && <p className="text-muted-foreground">{(sec as any).body}</p>}
              {"list" in sec && (
                <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                  {(sec as any).list.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}

        <div className="p-4 bg-muted/40 rounded-2xl text-xs text-muted-foreground">
          {l === "en"
            ? "These Terms of Service constitute a binding agreement between you and Aura Messenger. By using Aura, you acknowledge that you have read, understood, and agree to be bound by these Terms."
            : "Настоящее Соглашение является обязательным договором между вами и Aura Messenger. Используя Aura, вы подтверждаете, что прочитали, поняли и согласны соблюдать его условия."}
        </div>
      </div>
    </div>
  );
}
