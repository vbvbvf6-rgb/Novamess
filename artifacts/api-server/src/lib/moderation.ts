export interface ModerationResult {
  flagged: boolean;
  categories: string[];
  confidence: number;
  reason: string;
}

const INSULT_PATTERNS = [
  /\bмудак|мудил[ао]|мудозвон/i,
  /\bдебил|дебильн/i,
  /\bидиот|идиотк/i,
  /\bтупица|тупой\s+[^\s]+|тупорыл/i,
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
  /\bублюдок/i,
  /\bнегодяй/i,
  /\bзлодей/i,
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
  /\bi\s+hate\s+you\b/i,
  /\bwhore\b/i,
  /\bbitch\b.*\bstupid|stupid.*\bbitch\b/i,
  /убей\s+(себя|его|её|их|всех)/i,
  /\bубийца\b.*ты|ты.*\bубийца\b/i,
];

export function localModerationCheck(text: string): ModerationResult | null {
  const lower = text.toLowerCase();
  for (const pattern of INSULT_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        flagged: true,
        categories: ["harassment"],
        confidence: 95,
        reason: "Обнаружены оскорбления или нецензурная лексика",
      };
    }
  }
  return null;
}

const SYSTEM_PROMPT = `You are a strict content moderation AI for a social platform. Analyze the post text and return ONLY a JSON object (no markdown, no explanation) with:
- "flagged": boolean (true if content violates rules)
- "categories": array from: ["spam","hate_speech","adult_content","violence","harassment","misinformation","self_harm"]
- "confidence": integer 0-100
- "reason": string (short explanation in Russian, max 100 chars, empty if not flagged)

Flag ANY of the following: insults directed at a person or group, name-calling, mockery, humiliation, hate speech, slurs, calls to violence, explicit content, severe harassment, dangerous self-harm encouragement, or obvious spam. Do NOT allow personal attacks even if phrased subtly. Return flagged=true for any post containing insults, toxic language, or degrading content targeting real people.`;

async function tryModerate(model: string, text: string): Promise<ModerationResult | null> {
  try {
    const r = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text.slice(0, 1000) },
        ],
        max_tokens: 200,
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(12000),
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
  if (!text || text.trim().length < 5) return safe;

  const local = localModerationCheck(text);
  if (local) return local;

  let result = await tryModerate("openai", text);
  if (!result) result = await tryModerate("mistral", text);
  return result || safe;
}
