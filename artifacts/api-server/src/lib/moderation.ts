export interface ModerationResult {
  flagged: boolean;
  categories: string[];
  confidence: number;
  reason: string;
}

// ─── Regex pattern banks ──────────────────────────────────────────────────────

const INSULT_PATTERNS = [
  /\bмудак|мудил[ао]|мудозвон/i,
  /\bдебил|дебильн/i,
  /\bидиот|идиотк/i,
  /\bтупица|тупорыл/i,
  /\bпридурок|придурк/i,
  /\bурод|уродин/i,
  /\bкозёл|козел\b|козлин/i,
  /\bлох\b|лошар/i,
  /\bбаран\b|барани/i,
  /\bдрочил|долбоёб|долбоеб/i,
  /\bпиздабол|пиздёж/i,
  /\bсволочь\b|сволоч/i,
  /\bублюдок|ублюдк/i,
  /\bпадла\b|падлюк/i,
  /\bохуел|охуеть|офигел/i,
  /\bзаткнись|заткни\s+пасть/i,
  /\bшлюха|шлюхи|шлюху/i,
  /\bпроститутк/i,
  /\bнигг[еэ]р|нигр[еа]/i,
  /\bчурк[аио]/i,
  /\bхохол|хохлы/i,
  /\bкацап/i,
  /\bпидор|пидар|пидр/i,
  /\bгандон/i,
  /\bебан[ыуое]|ёбан[ыуое]/i,
  /\bеблан|ёблан/i,
  /\bмразь\b|мрази/i,
  /\bтварь\b|твари\b/i,
  /\bскотин[аы]/i,
  /\bнегодяй/i,
  /\bfuck\s+you\b/i,
  /\bkill\s+yourself\b/i,
  /\bkys\b/i,
  /\bass\s*hole\b/i,
  /\bmother\s*fuck/i,
  /\bnigger\b|\bnigga\b/i,
  /\bcunt\b/i,
  /\bfaggot\b/i,
  /\bretard\b/i,
  /\bgo\s+die\b/i,
  /\bwhore\b/i,
  /\bbitch\b.*\bstupid|stupid.*\bbitch\b/i,
  /убей\s+(себя|его|её|их|всех)/i,
  /\bублюдок/i,
  /\bсука\b/i,
  /\bбляд[ьь]|блядь|бляди/i,
  /\bпиздец\b/i,
  /\bпиздит/i,
  /\bхуйло|хуесос/i,
  /\bзалупа/i,
  /\bпиздюк/i,
  /\bмокрощёлка/i,
  /\bпиздун/i,
  /\bшалав[аы]/i,
  /\bкурв[аы]/i,
  /\bгавнюк/i,
  /\bдрист/i,
  /\bпетух\b.*\b(зона|тюрьма|ты|сам)/i,
  /\bты\b.*\bпетух\b/i,
  /\bзалупа/i,
  /\bоблевать|облей себя/i,
  /\bотстой\b.*\bты|ты.*\bотстой/i,
  /\bчмо\b/i,
  /\bчмошник/i,
  /\bлузер\b/i,
  /\bиди\s+(нахуй|нафиг|в\s+жопу|в\s+пизду|в\s+ад|лесом)/i,
  /\bпошёл\s+(нахуй|нафиг|в\s+жопу|в\s+пизду)/i,
  /\bнасилуй|изнасилу/i,
  /\bтупая\s+(баба|девка|корова)/i,
  /\bжирная\s+(свинья|корова|уродина)/i,
  /\bдегенерат/i,
  /\bпсих[оа]\b/i,
  /\bбомж\b.*ты|ты.*\bбомж\b/i,
  /\bпридурк/i,
  /\bоскотинился/i,
  /\bвыродок/i,
];

const VIOLENCE_PATTERNS = [
  /убью\s+(тебя|вас|его|её|их)/i,
  /\bвзорву|взрыв\s+план/i,
  /\bсделаю\s+(больно|хуже)/i,
  /\bпристрелю|застрелю/i,
  /\bзарежу|зарезать/i,
  /\bизобью|изуродую/i,
  /\bперебью\s+всех/i,
  /\bкровь\s+(прольётся|польётся)/i,
  /\bрасстреляю/i,
  /\bterroris[mt]/i,
  /\bbomb\s+(threat|plan)/i,
  /\bi('ll)?\s+(kill|murder|stab|shoot)\s+(you|him|her|them|everyone)/i,
  /\bkill\s+(all|everyone)\b/i,
];

const SELFHARM_PATTERNS = [
  /\bпорежь?\s+себя/i,
  /\bсуицид(альн)?/i,
  /\bвскрой\s+(вены|себя)/i,
  /\bсам[оа]убийств/i,
  /\bудавись/i,
  /\bповесься/i,
  /\bвыброси(сь|тесь)\s+из\s+(окна|здания)/i,
  /\bcut\s+yourself/i,
  /\bself[\s-]harm/i,
  /\bhang\s+yourself/i,
  /\bjump\s+off\b/i,
  /\boverdos(e|ing)/i,
];

const SEXUAL_PATTERNS = [
  /\bпорн[оа]/i,
  /\bхочу\s+тебя\s+трахну/i,
  /\bсекс\s+за\s+деньги/i,
  /\bинтим\s+(услуг|предложен)/i,
  /\bнаша\s+ночь\s+вместе.*деньги/i,
  /\bporn(?:hub|site|\b)/i,
  /\bxxx\b/i,
  /\bonly\s*fans/i,
  /\bnaked\s+(photos?|pics?|videos?)/i,
  /\bнюд[ыа]/i,
  /\bголые\s+фото/i,
  /\bэскорт\s+услуг/i,
];

const SPAM_PATTERNS = [
  /\bзарабатывай?\s+от\s+\d+/i,
  /\b\d{4,}\s*руб(лей)?\s+в\s+день/i,
  /\bбыстрый\s+заработок/i,
  /\bкликни\s+по\s+ссылк/i,
  /\bперейди\s+по\s+ссылк/i,
  /\b(crypto|bitcoin|btc)\s+invest/i,
  /\bказино\s+(онлайн|выигрыш)/i,
  /\bбесплатн[оа]\s+получи/i,
  /\bприсоединяйся\s+к\s+(нашей|моей)\s+команд/i,
  /(\S+\s*){0,3}(телеграм|telegram|tg)\s*@\S+/i,
  /\bMLM\b|\bсетевой\s+маркетинг/i,
];

const HATE_PATTERNS = [
  /\bсмерть\s+(евреям|украинцам|русским|чёрным|мусульманам)/i,
  /\bдолой\s+\w+(цев|ян|ей)\b/i,
  /\b(евреи|жиды)\s+(виноват|управляют|захватил)/i,
  /\bбелая\s+раса\s+(лучше|выше)/i,
  /\b(чёрные|нигеры|азиаты)\s+(тупые|хуже|уберитесь)/i,
  /\bнационал[\s-]?(социалист|фашизм)/i,
  /\bheil\s+hitler/i,
  /\b88\b.*\bheil|heil.*\b88\b/i,
  /\bwhite\s+power\b/i,
  /\bкнига\s+мира.*взрыв/i,
];

export function checkCustomBannedWords(text: string, words: string[]): ModerationResult | null {
  if (!words.length) return null;
  const lower = text.toLowerCase();
  for (const w of words) {
    if (!w.trim()) continue;
    if (lower.includes(w.toLowerCase())) {
      return {
        flagged: true,
        categories: ["custom_banned"],
        confidence: 99,
        reason: `Запрещённое слово: «${w}»`,
      };
    }
  }
  return null;
}

export function localModerationCheck(text: string): ModerationResult | null {
  const categories: string[] = [];

  for (const p of INSULT_PATTERNS) {
    if (p.test(text)) {
      categories.push("harassment");
      break;
    }
  }
  for (const p of VIOLENCE_PATTERNS) {
    if (p.test(text)) {
      categories.push("violence");
      break;
    }
  }
  for (const p of SELFHARM_PATTERNS) {
    if (p.test(text)) {
      categories.push("self_harm");
      break;
    }
  }
  for (const p of SEXUAL_PATTERNS) {
    if (p.test(text)) {
      categories.push("adult_content");
      break;
    }
  }
  for (const p of SPAM_PATTERNS) {
    if (p.test(text)) {
      categories.push("spam");
      break;
    }
  }
  for (const p of HATE_PATTERNS) {
    if (p.test(text)) {
      categories.push("hate_speech");
      break;
    }
  }

  if (categories.length === 0) return null;

  const REASON_MAP: Record<string, string> = {
    harassment: "Оскорбления и нецензурная лексика",
    violence: "Призывы к насилию или угрозы",
    self_harm: "Пропаганда самоповреждения",
    adult_content: "Сексуальный или эротический контент",
    spam: "Спам или реклама",
    hate_speech: "Разжигание ненависти",
  };

  return {
    flagged: true,
    categories,
    confidence: 97,
    reason: REASON_MAP[categories[0]] || "Нарушение правил сообщества",
  };
}

// ─── AI moderation ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an ultra-strict content moderation AI for a social platform with zero tolerance for harmful content. Analyze the text and return ONLY a JSON object (no markdown, no extra text) with these fields:
- "flagged": boolean
- "categories": array from ["spam","hate_speech","adult_content","violence","harassment","misinformation","self_harm"]
- "confidence": integer 0-100
- "reason": short string in Russian (max 80 chars), empty string if not flagged

ALWAYS flag (confidence ≥ 80) if the text contains ANY of:
- Insults, slurs, name-calling, mockery, humiliation (even subtle or indirect)
- Threats or calls to violence against any person or group
- Hate speech targeting ethnicity, religion, gender, or orientation
- Explicit sexual content, solicitation, or pornography references
- Encouragement of self-harm or suicide
- Obvious spam, pyramid schemes, or suspicious external links
- Extremist propaganda or incitement

Flag with confidence 50-79 for:
- Passive-aggressive attacks, veiled insults, or toxic framing
- Borderline offensive content or dog whistles
- Excessive profanity without direct attack (context-dependent)

Do NOT flag neutral discussion, news references, sarcasm about situations (not people), mild frustration, or general opinions.
IMPORTANT: Err on the side of flagging — false negatives are far worse than false positives on this platform.`;

async function tryModerate(model: string, text: string): Promise<ModerationResult | null> {
  try {
    const r = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text.slice(0, 1200) },
        ],
        max_tokens: 150,
        temperature: 0.05,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return null;
    const data = await r.json() as any;
    const raw = data.choices?.[0]?.message?.content || "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      flagged: !!parsed.flagged,
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      confidence: Number(parsed.confidence) || 0,
      reason: String(parsed.reason || ""),
    };
  } catch {
    return null;
  }
}

export async function moderateContent(text: string): Promise<ModerationResult> {
  const safe: ModerationResult = { flagged: false, categories: [], confidence: 0, reason: "" };
  if (!text || text.trim().length < 3) return safe;

  const local = localModerationCheck(text);
  if (local) return local;

  let result = await tryModerate("openai", text);
  if (!result) result = await tryModerate("mistral", text);
  return result || safe;
}
