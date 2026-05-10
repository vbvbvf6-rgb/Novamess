import { db, giftItemsTable, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { createHash } from "node:crypto";

const hash = (pass: string) => createHash("sha256").update(pass).digest("hex");

const GIFT_CATALOG = [
  // ── COMMON (25–100 ⚡) ──────────────────────────────────────────────────
  { name: "Сердечко",          emoji: "❤️",  animationType: "hearts",    rarity: "common",    stars: 1,  price: 25,    description: "Тёплое сердечко для близкого человека" },
  { name: "Звёздочка",         emoji: "⭐",  animationType: "stars",     rarity: "common",    stars: 1,  price: 25,    description: "Маленькая, но яркая звезда" },
  { name: "Мыльный пузырь",    emoji: "🫧",  animationType: "sparkle",   rarity: "common",    stars: 1,  price: 25,    description: "Радужный пузырь — лёгкость и радость" },
  { name: "Конфета",           emoji: "🍬",  animationType: "bounce",    rarity: "common",    stars: 1,  price: 30,    description: "Сладкая конфета для хорошего настроения" },
  { name: "Клубника",          emoji: "🍓",  animationType: "bounce",    rarity: "common",    stars: 1,  price: 35,    description: "Спелая и сочная клубника" },
  { name: "Леденец",           emoji: "🍭",  animationType: "sparkle",   rarity: "common",    stars: 1,  price: 35,    description: "Яркий леденец на палочке" },
  { name: "Ромашка",           emoji: "🌼",  animationType: "confetti",  rarity: "common",    stars: 1,  price: 35,    description: "Нежная ромашка — символ чистоты" },
  { name: "Цветок сакуры",     emoji: "🌸",  animationType: "confetti",  rarity: "common",    stars: 1,  price: 40,    description: "Нежный цветок весны" },
  { name: "Пончик",            emoji: "🍩",  animationType: "bounce",    rarity: "common",    stars: 1,  price: 40,    description: "Сладкий пончик на удачу" },
  { name: "Мороженое",         emoji: "🍦",  animationType: "bounce",    rarity: "common",    stars: 2,  price: 40,    description: "Холодное и вкусное мороженое" },
  { name: "Рыбка",             emoji: "🐟",  animationType: "bounce",    rarity: "common",    stars: 2,  price: 45,    description: "Яркая тропическая рыбка" },
  { name: "Подсолнух",         emoji: "🌻",  animationType: "sparkle",   rarity: "common",    stars: 2,  price: 45,    description: "Солнечный подсолнух — заряд энергии" },
  { name: "Чашка кофе",        emoji: "☕",  animationType: "sparkle",   rarity: "common",    stars: 2,  price: 50,    description: "Ароматная чашка кофе" },
  { name: "Луна",              emoji: "🌙",  animationType: "sparkle",   rarity: "common",    stars: 2,  price: 50,    description: "Ночная луна светит только тебе" },
  { name: "Четырёхлистник",    emoji: "🍀",  animationType: "confetti",  rarity: "common",    stars: 2,  price: 50,    description: "Клевер — символ удачи" },
  { name: "Бабочка",           emoji: "🦋",  animationType: "magic",     rarity: "common",    stars: 2,  price: 55,    description: "Прекрасная бабочка — символ перемен" },
  { name: "Котёнок",           emoji: "🐱",  animationType: "hearts",    rarity: "common",    stars: 2,  price: 60,    description: "Самый милый котёнок" },
  { name: "Воздушный шар",     emoji: "🎈",  animationType: "balloons",  rarity: "common",    stars: 2,  price: 60,    description: "Праздничный воздушный шарик" },
  { name: "Ретро-телефон",     emoji: "📞",  animationType: "bounce",    rarity: "common",    stars: 2,  price: 70,    description: "Классический ретро-телефон" },
  { name: "Пицца",             emoji: "🍕",  animationType: "bounce",    rarity: "common",    stars: 2,  price: 75,    description: "Кусочек дружбы и тепла" },
  { name: "Медвежонок",        emoji: "🧸",  animationType: "hearts",    rarity: "common",    stars: 2,  price: 80,    description: "Мягкий плюшевый медвежонок" },
  { name: "Торт",              emoji: "🎂",  animationType: "confetti",  rarity: "common",    stars: 2,  price: 90,    description: "Праздничный торт" },
  { name: "Игровая приставка", emoji: "🎮",  animationType: "lightning", rarity: "common",    stars: 2,  price: 90,    description: "Для настоящих геймеров" },
  { name: "Снеговик",          emoji: "⛄",  animationType: "sparkle",   rarity: "common",    stars: 2,  price: 55,    description: "Весёлый снеговик — зимнее настроение" },
  { name: "Радужный кит",      emoji: "🐳",  animationType: "balloons",  rarity: "common",    stars: 2,  price: 65,    description: "Огромный добродушный кит" },

  // ── RARE (250–1000 ⚡) ─────────────────────────────────────────────────
  { name: "Корона",            emoji: "👑",  animationType: "sparkle",   rarity: "rare",      stars: 3,  price: 250,   description: "Почувствуй себя королём" },
  { name: "Красная роза",      emoji: "🌹",  animationType: "hearts",    rarity: "rare",      stars: 3,  price: 375,   description: "Алая роза — символ страсти" },
  { name: "Бриллиант",         emoji: "💎",  animationType: "diamonds",  rarity: "rare",      stars: 4,  price: 500,   description: "Сверкающий бриллиант" },
  { name: "Золотая монета",    emoji: "🪙",  animationType: "sparkle",   rarity: "rare",      stars: 3,  price: 400,   description: "Редкая золотая монета на удачу" },
  { name: "Ракета",            emoji: "🚀",  animationType: "lightning", rarity: "rare",      stars: 4,  price: 625,   description: "В небо и выше!" },
  { name: "Гитара",            emoji: "🎸",  animationType: "sparkle",   rarity: "rare",      stars: 4,  price: 500,   description: "Рок-н-ролл навсегда" },
  { name: "Кубок",             emoji: "🏆",  animationType: "fireworks", rarity: "rare",      stars: 5,  price: 875,   description: "Ты настоящий победитель" },
  { name: "Радуга",            emoji: "🌈",  animationType: "confetti",  rarity: "rare",      stars: 4,  price: 440,   description: "Яркая радуга после дождя" },
  { name: "Молния",            emoji: "⚡",  animationType: "lightning", rarity: "rare",      stars: 5,  price: 750,   description: "Электрическая энергия" },
  { name: "Дельфин",           emoji: "🐬",  animationType: "bounce",    rarity: "rare",      stars: 4,  price: 350,   description: "Игривый и умный дельфин" },
  { name: "Лиса",              emoji: "🦊",  animationType: "bounce",    rarity: "rare",      stars: 3,  price: 310,   description: "Хитрая и обаятельная лиса" },
  { name: "Сова",              emoji: "🦉",  animationType: "sparkle",   rarity: "rare",      stars: 4,  price: 420,   description: "Мудрая ночная сова" },
  { name: "Акула",             emoji: "🦈",  animationType: "lightning", rarity: "rare",      stars: 4,  price: 600,   description: "Грозная хозяйка морей" },
  { name: "Парусник",          emoji: "⛵",  animationType: "bounce",    rarity: "rare",      stars: 3,  price: 450,   description: "Свободный парусник в открытом море" },
  { name: "Самоцвет",          emoji: "🏅",  animationType: "sparkle",   rarity: "rare",      stars: 5,  price: 1000,  description: "Редкий самоцвет" },
  { name: "Медаль",            emoji: "🥇",  animationType: "fireworks", rarity: "rare",      stars: 5,  price: 950,   description: "Золотая медаль за победу" },
  { name: "Попугай",           emoji: "🦜",  animationType: "confetti",  rarity: "rare",      stars: 3,  price: 380,   description: "Яркий тропический попугай" },
  { name: "Волшебная лампа",   emoji: "🪔",  animationType: "magic",     rarity: "rare",      stars: 4,  price: 550,   description: "Лампа Аладдина — исполни желание" },
  { name: "Морская звезда",    emoji: "⭐",  animationType: "stars",     rarity: "rare",      stars: 4,  price: 480,   description: "Яркая морская звезда" },
  { name: "Горящее сердце",    emoji: "❤️‍🔥", animationType: "flame",    rarity: "rare",      stars: 5,  price: 800,   description: "Страстное огненное сердце" },

  // ── EPIC (1500–6000 ⚡) ────────────────────────────────────────────────
  { name: "Дракон",            emoji: "🐉",  animationType: "flame",     rarity: "epic",      stars: 6,  price: 1500,  description: "Могущественный огнедышащий дракон" },
  { name: "Единорог",          emoji: "🦄",  animationType: "magic",     rarity: "epic",      stars: 7,  price: 2500,  description: "Магический единорог из легенд" },
  { name: "Феникс",            emoji: "🦅",  animationType: "flame",     rarity: "epic",      stars: 7,  price: 3000,  description: "Птица феникс — возрождение" },
  { name: "Планета",           emoji: "🪐",  animationType: "galaxy",    rarity: "epic",      stars: 8,  price: 3750,  description: "Далёкая загадочная планета" },
  { name: "Волшебство",        emoji: "🪄",  animationType: "magic",     rarity: "epic",      stars: 8,  price: 4500,  description: "Исполни любое желание" },
  { name: "Кристалл",          emoji: "🔮",  animationType: "galaxy",    rarity: "epic",      stars: 9,  price: 6000,  description: "Магический предсказательный шар" },
  { name: "Пегас",             emoji: "🐎",  animationType: "magic",     rarity: "epic",      stars: 6,  price: 2000,  description: "Крылатый конь богов" },
  { name: "Нарвал",            emoji: "🐋",  animationType: "sparkle",   rarity: "epic",      stars: 7,  price: 2200,  description: "Мифический морской единорог" },
  { name: "Хрустальное сердце",emoji: "💠",  animationType: "diamonds",  rarity: "epic",      stars: 8,  price: 3500,  description: "Хрустальное сердце вечной любви" },
  { name: "Жар-птица",         emoji: "🔥",  animationType: "flame",     rarity: "epic",      stars: 7,  price: 4000,  description: "Огненная птица из сказок" },
  { name: "Морской конёк",     emoji: "🫀",  animationType: "magic",     rarity: "epic",      stars: 7,  price: 2800,  description: "Волшебный морской конёк" },
  { name: "Грифон",            emoji: "🦁",  animationType: "flame",     rarity: "epic",      stars: 9,  price: 5000,  description: "Гордый страж — лев и орёл в одном" },
  { name: "Сапфировый кулон",  emoji: "💎",  animationType: "diamonds",  rarity: "epic",      stars: 8,  price: 3200,  description: "Редкий сапфировый кулон" },
  { name: "Магический гриб",   emoji: "🍄",  animationType: "magic",     rarity: "epic",      stars: 6,  price: 1700,  description: "Волшебный гриб из другого мира" },
  { name: "Золотая рыбка",     emoji: "🐟",  animationType: "sparkle",   rarity: "epic",      stars: 7,  price: 2100,  description: "Исполняет три желания" },
  { name: "Рубиновое кольцо",  emoji: "💍",  animationType: "hearts",    rarity: "epic",      stars: 8,  price: 4200,  description: "Кольцо с огненным рубином" },
  { name: "Волшебная скрипка", emoji: "🎻",  animationType: "magic",     rarity: "epic",      stars: 7,  price: 3900,  description: "Скрипка, играющая сама по себе" },
  { name: "Чёрный кот",        emoji: "🐈‍⬛", animationType: "magic",    rarity: "epic",      stars: 6,  price: 2600,  description: "Таинственный чёрный кот с луной" },
  { name: "Сфинкс",            emoji: "🏺",  animationType: "galaxy",    rarity: "epic",      stars: 9,  price: 5500,  description: "Загадочный страж тайн веков" },
  { name: "Огненный дракон",   emoji: "🐲",  animationType: "flame",     rarity: "epic",      stars: 7,  price: 1800,  description: "Дракон, извергающий пламя" },

  // ── LEGENDARY (12500–125000 ⚡) ────────────────────────────────────────
  { name: "Галактика",         emoji: "🌌",  animationType: "galaxy",    rarity: "legendary", stars: 12, price: 12500,  description: "Целая галактика в твоих руках" },
  { name: "Ангел",             emoji: "👼",  animationType: "magic",     rarity: "legendary", stars: 15, price: 25000,  description: "Небесный ангел-хранитель" },
  { name: "Пульс",             emoji: "💜",  animationType: "fireworks", rarity: "legendary", stars: 20, price: 50000,  description: "Символ мессенджера Pulse" },
  { name: "Легендарная звезда",emoji: "🌟",  animationType: "stars",     rarity: "legendary", stars: 25, price: 75000,  description: "Легендарная путеводная звезда" },
  { name: "Бесконечность",     emoji: "♾️",  animationType: "galaxy",    rarity: "legendary", stars: 50, price: 125000, description: "Бесконечность и далее — высший подарок" },
  { name: "Золотой дракон",    emoji: "🐉",  animationType: "galaxy",    rarity: "legendary", stars: 14, price: 15000,  description: "Могущественный золотой дракон удачи" },
  { name: "Небесный кит",      emoji: "🐋",  animationType: "galaxy",    rarity: "legendary", stars: 16, price: 18000,  description: "Гигантский кит плывёт в небесах" },
  { name: "Северное сияние",   emoji: "🌌",  animationType: "magic",     rarity: "legendary", stars: 17, price: 22000,  description: "Магическое северное сияние" },
  { name: "Джинн",             emoji: "🧞",  animationType: "vortex",    rarity: "legendary", stars: 18, price: 30000,  description: "Могущественный джинн исполняет желания" },
  { name: "Хрустальный дворец",emoji: "🏰",  animationType: "diamonds",  rarity: "legendary", stars: 19, price: 35000,  description: "Величественный дворец из хрусталя" },
  { name: "Единый трон",       emoji: "👑",  animationType: "fireworks", rarity: "legendary", stars: 21, price: 45000,  description: "Трон всех королей и богов" },
  { name: "Мировое дерево",    emoji: "🌲",  animationType: "magic",     rarity: "legendary", stars: 15, price: 20000,  description: "Иггдрасиль — ось всего мироздания" },
  { name: "Небесный феникс",   emoji: "🦅",  animationType: "supernova", rarity: "legendary", stars: 22, price: 40000,  description: "Феникс, рождённый из звёзд" },
  { name: "Нептун",            emoji: "🔱",  animationType: "vortex",    rarity: "legendary", stars: 23, price: 60000,  description: "Властелин морей и океанов" },
  { name: "Звёздная колесница",emoji: "⭐",  animationType: "stars",     rarity: "legendary", stars: 24, price: 100000, description: "Колесница богов несётся сквозь звёзды" },

  // ── COSMIC (150000–1000000 ⚡) ──────────────────────────────────────────
  { name: "Нейтронная звезда", emoji: "💥",  animationType: "supernova", rarity: "cosmic",    stars: 60,  price: 150000,  description: "Сверхплотная звезда с невероятной энергией" },
  { name: "Квазар",            emoji: "🌠",  animationType: "supernova", rarity: "cosmic",    stars: 75,  price: 250000,  description: "Мощнейший источник света во вселенной" },
  { name: "Чёрная дыра",       emoji: "🌀",  animationType: "vortex",    rarity: "cosmic",    stars: 90,  price: 375000,  description: "Точка, из которой нет возврата" },
  { name: "Мультивселенная",   emoji: "🪩",  animationType: "vortex",    rarity: "cosmic",    stars: 99,  price: 450000,  description: "Бесконечное множество параллельных миров" },
  { name: "Абсолют",           emoji: "⚜️",  animationType: "supernova", rarity: "cosmic",    stars: 100, price: 500000,  description: "Абсолютное совершенство — предел возможного" },
  { name: "Сингулярность",     emoji: "💠",  animationType: "vortex",    rarity: "cosmic",    stars: 150, price: 750000,  description: "Точка начала всего — бесконечная плотность бытия" },
  { name: "Создатель",         emoji: "🌐",  animationType: "supernova", rarity: "cosmic",    stars: 200, price: 1000000, description: "Высший подарок вселенной — тот, кто создал всё сущее" },
  { name: "Вселенский огонь",  emoji: "🔥",  animationType: "supernova", rarity: "cosmic",    stars: 80,  price: 300000,  description: "Первичный огонь начала всего" },
  { name: "Бог Грома",         emoji: "⚡",  animationType: "lightning", rarity: "cosmic",    stars: 70,  price: 200000,  description: "Громовержец — повелитель молний" },
  { name: "Ось Мира",          emoji: "⚖️",  animationType: "galaxy",    rarity: "cosmic",    stars: 65,  price: 175000,  description: "Незримая ось, на которой держится вселенная" },
  { name: "Левиафан",          emoji: "🐉",  animationType: "vortex",    rarity: "cosmic",    stars: 88,  price: 350000,  description: "Библейское чудовище глубин" },
  { name: "Солнечный дракон",  emoji: "🌞",  animationType: "supernova", rarity: "cosmic",    stars: 77,  price: 280000,  description: "Дракон, рождённый в короне солнца" },
  { name: "Вечность",          emoji: "♾️",  animationType: "galaxy",    rarity: "cosmic",    stars: 95,  price: 420000,  description: "Бесконечное течение времени" },
  { name: "Первозданный Хаос", emoji: "💫",  animationType: "vortex",    rarity: "cosmic",    stars: 98,  price: 480000,  description: "До слова «да будет свет» был Хаос" },
  { name: "Высший Разум",      emoji: "🔮",  animationType: "supernova", rarity: "cosmic",    stars: 110, price: 550000,  description: "Сознание, пронизывающее всё сущее" },

  // ── PRIME EXCLUSIVE ────────────────────────────────────────────────────
  { name: "Корона Prime",      emoji: "👑",  animationType: "magic",     rarity: "epic",      stars: 10, price: 5000,   description: "Эксклюзивная корона для избранных Prime-участников", primeOnly: true },
  { name: "Пульс Сердца",      emoji: "💜",  animationType: "hearts",    rarity: "legendary", stars: 18, price: 30000,  description: "Бьющийся пульс — символ вечной связи Prime", primeOnly: true },
  { name: "Звезда Prime",      emoji: "⭐",  animationType: "stars",     rarity: "legendary", stars: 22, price: 55000,  description: "Эксклюзивная звезда — только для Prime-участников", primeOnly: true },
  { name: "Вселенский Огонь",  emoji: "🔥",  animationType: "flame",     rarity: "cosmic",    stars: 80, price: 300000, description: "Огонь, что горит вечно — особый дар Prime", primeOnly: true },
  { name: "Сапфировый Трон",   emoji: "💎",  animationType: "galaxy",    rarity: "cosmic",    stars: 85, price: 120000, description: "Трон из сапфира для истинных Prime-небожителей", primeOnly: true },
];

const SYSTEM_USERS = [
  {
    username: "deepseek_ai",
    displayName: "DeepSeek AI",
    avatarColor: "#8B5CF6",
    avatarUrl: "/deepseek-avatar.jpg",
    isBot: true,
    isVerified: true,
    status: "online",
  },
  {
    username: "creater_messenger",
    displayName: "creater_messenger",
    avatarColor: "#F59E0B",
    isBot: false,
    isVerified: false,
    isAdmin: true,
    status: "online",
    password: "pulse2024",
  },
];

export async function runSeed() {
  // Upsert full gift catalog (name is the key)
  for (const item of GIFT_CATALOG) {
    const existing = await db.execute(
      sql`SELECT id FROM gift_items WHERE name = ${item.name} LIMIT 1`
    );
    if ((existing.rows as any[]).length === 0) {
      await db.execute(sql`
        INSERT INTO gift_items (name, emoji, animation_type, rarity, stars, price, description, prime_only)
        VALUES (${item.name}, ${item.emoji}, ${item.animationType}, ${item.rarity},
                ${item.stars}, ${item.price}, ${item.description}, ${(item as any).primeOnly ?? false})
      `);
    } else {
      await db.execute(sql`
        UPDATE gift_items SET emoji=${item.emoji}, animation_type=${item.animationType},
          rarity=${item.rarity}, stars=${item.stars}, price=${item.price}, description=${item.description},
          prime_only=${(item as any).primeOnly ?? false}
        WHERE name = ${item.name}
      `);
    }
  }
  const total = await db.execute(sql`SELECT COUNT(*) as cnt FROM gift_items`);
  console.log(`[seed] Gift catalog: ${(total.rows[0] as any).cnt} items`);

  // Ensure system users exist
  for (const u of SYSTEM_USERS) {
    const rows = await db.execute(sql`SELECT id FROM users WHERE username = ${u.username} LIMIT 1`);
    if ((rows.rows as any[]).length === 0) {
      const pwHash = (u as any).password ? hash((u as any).password) : null;
      await db.execute(sql`
        INSERT INTO users (username, display_name, avatar_color, avatar_url, status, is_bot, is_verified, is_admin, password_hash, balance)
        VALUES (
          ${u.username}, ${u.displayName}, ${u.avatarColor}, ${(u as any).avatarUrl ?? null}, ${u.status},
          ${u.isBot ?? false}, ${u.isVerified ?? false}, ${(u as any).isAdmin ?? false},
          ${pwHash}, 0
        )
      `);
      console.log(`[seed] Created user: ${u.username}`);
    } else if ((u as any).avatarUrl) {
      await db.execute(sql`UPDATE users SET avatar_url = ${(u as any).avatarUrl} WHERE username = ${u.username}`);
    }
  }

  // Ensure DeepSeek bot is in all non-bot users' contacts
  const bot = await db.execute(sql`SELECT id FROM users WHERE username = 'deepseek_ai' LIMIT 1`);
  const botId = (bot.rows as any[])[0]?.id;
  if (botId) {
    await db.execute(sql`
      INSERT INTO contacts (user_id, contact_id)
      SELECT u.id, ${botId} FROM users u
      WHERE u.is_bot = false AND u.id != ${botId}
        AND NOT EXISTS (SELECT 1 FROM contacts c WHERE c.user_id = u.id AND c.contact_id = ${botId})
    `);
  }
}
