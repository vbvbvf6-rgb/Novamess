import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const GIFT_CATALOG = [
  // ── COMMON (50–200 ⚡) ──────────────────────────────────────────────────
  { name: "Яблоко",            emoji: "🍎",  animationType: "bounce",    rarity: "common",    stars: 1,  price: 60,    description: "Спелое красное яблоко",                    primeOnly: false },
  { name: "Персик",            emoji: "🍑",  animationType: "bounce",    rarity: "common",    stars: 1,  price: 65,    description: "Сладкий летний персик",                    primeOnly: false },
  { name: "Вишня",             emoji: "🍒",  animationType: "bounce",    rarity: "common",    stars: 1,  price: 70,    description: "Спелая вишня — двойная удача",             primeOnly: false },
  { name: "Виноград",          emoji: "🍇",  animationType: "bounce",    rarity: "common",    stars: 1,  price: 75,    description: "Сочная гроздь винограда",                  primeOnly: false },
  { name: "Капкейк",           emoji: "🧁",  animationType: "confetti",  rarity: "common",    stars: 1,  price: 80,    description: "Нежный капкейк со сливками",               primeOnly: false },
  { name: "Шоколад",           emoji: "🍫",  animationType: "bounce",    rarity: "common",    stars: 2,  price: 90,    description: "Горький шоколад — настоящий вкус",         primeOnly: false },
  { name: "Печенье",           emoji: "🍪",  animationType: "bounce",    rarity: "common",    stars: 1,  price: 70,    description: "Хрустящее домашнее печенье",               primeOnly: false },
  { name: "Арбуз",             emoji: "🍉",  animationType: "bounce",    rarity: "common",    stars: 1,  price: 70,    description: "Сочный летний арбуз",                      primeOnly: false },
  { name: "Тюльпан",           emoji: "🌷",  animationType: "confetti",  rarity: "common",    stars: 2,  price: 90,    description: "Яркий весенний тюльпан",                   primeOnly: false },
  { name: "Гибискус",          emoji: "🌺",  animationType: "confetti",  rarity: "common",    stars: 2,  price: 95,    description: "Тропический цветок гибискуса",             primeOnly: false },
  { name: "Пингвин",           emoji: "🐧",  animationType: "bounce",    rarity: "common",    stars: 2,  price: 110,   description: "Забавный пингвин из Антарктики",           primeOnly: false },
  { name: "Щенок",             emoji: "🐶",  animationType: "hearts",    rarity: "common",    stars: 2,  price: 120,   description: "Самый верный друг",                        primeOnly: false },
  { name: "Кролик",            emoji: "🐰",  animationType: "bounce",    rarity: "common",    stars: 2,  price: 110,   description: "Пушистый белый кролик",                    primeOnly: false },
  { name: "Хомячок",           emoji: "🐹",  animationType: "hearts",    rarity: "common",    stars: 2,  price: 120,   description: "Милый хомячок за щёчкой",                  primeOnly: false },
  { name: "Пальма",            emoji: "🌴",  animationType: "sparkle",   rarity: "common",    stars: 2,  price: 100,   description: "Тропическая пальма у моря",                primeOnly: false },
  { name: "Снежинка",          emoji: "❄️",  animationType: "sparkle",   rarity: "common",    stars: 2,  price: 90,    description: "Уникальная снежинка",                      primeOnly: false },
  { name: "Осьминог",          emoji: "🐙",  animationType: "bounce",    rarity: "common",    stars: 2,  price: 130,   description: "Хитрый восьминогий друг",                  primeOnly: false },
  { name: "Краб",              emoji: "🦀",  animationType: "bounce",    rarity: "common",    stars: 2,  price: 130,   description: "Боковое мышление — краб думает иначе",     primeOnly: false },
  { name: "Черепаха",          emoji: "🐢",  animationType: "bounce",    rarity: "common",    stars: 2,  price: 100,   description: "Мудрая черепаха",                          primeOnly: false },
  { name: "Лягушка",           emoji: "🐸",  animationType: "bounce",    rarity: "common",    stars: 1,  price: 75,    description: "Весёлая зелёная лягушка",                  primeOnly: false },
  { name: "Сердечко",          emoji: "❤️",  animationType: "hearts",    rarity: "common",    stars: 1,  price: 50,    description: "Тёплое сердечко для близкого человека",    primeOnly: false },
  { name: "Звёздочка",         emoji: "⭐",  animationType: "stars",     rarity: "common",    stars: 1,  price: 50,    description: "Маленькая, но яркая звезда",               primeOnly: false },
  { name: "Мыльный пузырь",    emoji: "🫧",  animationType: "sparkle",   rarity: "common",    stars: 1,  price: 50,    description: "Радужный пузырь — лёгкость и радость",     primeOnly: false },
  { name: "Конфета",           emoji: "🍬",  animationType: "bounce",    rarity: "common",    stars: 1,  price: 60,    description: "Сладкая конфета для хорошего настроения",  primeOnly: false },
  { name: "Клубника",          emoji: "🍓",  animationType: "bounce",    rarity: "common",    stars: 1,  price: 70,    description: "Спелая и сочная клубника",                 primeOnly: false },
  { name: "Леденец",           emoji: "🍭",  animationType: "sparkle",   rarity: "common",    stars: 1,  price: 70,    description: "Яркий леденец на палочке",                 primeOnly: false },
  { name: "Ромашка",           emoji: "🌼",  animationType: "confetti",  rarity: "common",    stars: 1,  price: 70,    description: "Нежная ромашка — символ чистоты",          primeOnly: false },
  { name: "Цветок сакуры",     emoji: "🌸",  animationType: "confetti",  rarity: "common",    stars: 1,  price: 80,    description: "Нежный цветок весны",                      primeOnly: false },
  { name: "Пончик",            emoji: "🍩",  animationType: "bounce",    rarity: "common",    stars: 1,  price: 80,    description: "Сладкий пончик на удачу",                  primeOnly: false },
  { name: "Мороженое",         emoji: "🍦",  animationType: "bounce",    rarity: "common",    stars: 2,  price: 80,    description: "Холодное и вкусное мороженое",             primeOnly: false },
  { name: "Рыбка",             emoji: "🐟",  animationType: "bounce",    rarity: "common",    stars: 2,  price: 90,    description: "Яркая тропическая рыбка",                  primeOnly: false },
  { name: "Подсолнух",         emoji: "🌻",  animationType: "sparkle",   rarity: "common",    stars: 2,  price: 90,    description: "Солнечный подсолнух — заряд энергии",      primeOnly: false },
  { name: "Чашка кофе",        emoji: "☕",  animationType: "sparkle",   rarity: "common",    stars: 2,  price: 100,   description: "Ароматная чашка кофе",                     primeOnly: false },
  { name: "Луна",              emoji: "🌙",  animationType: "sparkle",   rarity: "common",    stars: 2,  price: 100,   description: "Ночная луна светит только тебе",           primeOnly: false },
  { name: "Четырёхлистник",    emoji: "🍀",  animationType: "confetti",  rarity: "common",    stars: 2,  price: 100,   description: "Клевер — символ удачи",                    primeOnly: false },
  { name: "Бабочка",           emoji: "🦋",  animationType: "magic",     rarity: "common",    stars: 2,  price: 110,   description: "Прекрасная бабочка — символ перемен",      primeOnly: false },
  { name: "Котёнок",           emoji: "🐱",  animationType: "hearts",    rarity: "common",    stars: 2,  price: 120,   description: "Самый милый котёнок",                      primeOnly: false },
  { name: "Воздушный шар",     emoji: "🎈",  animationType: "balloons",  rarity: "common",    stars: 2,  price: 120,   description: "Праздничный воздушный шарик",              primeOnly: false },
  { name: "Ретро-телефон",     emoji: "📞",  animationType: "bounce",    rarity: "common",    stars: 2,  price: 140,   description: "Классический ретро-телефон",               primeOnly: false },
  { name: "Пицца",             emoji: "🍕",  animationType: "bounce",    rarity: "common",    stars: 2,  price: 150,   description: "Кусочек дружбы и тепла",                   primeOnly: false },
  { name: "Медвежонок",        emoji: "🧸",  animationType: "hearts",    rarity: "common",    stars: 2,  price: 160,   description: "Мягкий плюшевый медвежонок",               primeOnly: false },
  { name: "Торт",              emoji: "🎂",  animationType: "confetti",  rarity: "common",    stars: 2,  price: 180,   description: "Праздничный торт",                         primeOnly: false },
  { name: "Игровая приставка", emoji: "🎮",  animationType: "lightning", rarity: "common",    stars: 2,  price: 180,   description: "Для настоящих геймеров",                   primeOnly: false },
  { name: "Снеговик",          emoji: "⛄",  animationType: "sparkle",   rarity: "common",    stars: 2,  price: 110,   description: "Весёлый снеговик — зимнее настроение",     primeOnly: false },
  { name: "Радужный кит",      emoji: "🐳",  animationType: "balloons",  rarity: "common",    stars: 2,  price: 130,   description: "Огромный добродушный кит",                 primeOnly: false },

  // ── RARE (500–2000 ⚡) ─────────────────────────────────────────────────
  { name: "Палитра",           emoji: "🎨",  animationType: "sparkle",   rarity: "rare",      stars: 3,  price: 600,   description: "Палитра художника — творчество без границ",primeOnly: false },
  { name: "Пазл",              emoji: "🧩",  animationType: "sparkle",   rarity: "rare",      stars: 3,  price: 650,   description: "Последний кусочек пазла",                  primeOnly: false },
  { name: "Мишень",            emoji: "🎯",  animationType: "lightning", rarity: "rare",      stars: 3,  price: 700,   description: "Точно в цель!",                            primeOnly: false },
  { name: "Барабаны",          emoji: "🥁",  animationType: "lightning", rarity: "rare",      stars: 4,  price: 850,   description: "Ритм, что зажигает",                       primeOnly: false },
  { name: "Пианино",           emoji: "🎹",  animationType: "magic",     rarity: "rare",      stars: 4,  price: 950,   description: "Клавиши судьбы",                           primeOnly: false },
  { name: "Бант",              emoji: "🎀",  animationType: "hearts",    rarity: "rare",      stars: 3,  price: 580,   description: "Нежный бант — сюрприз внутри",             primeOnly: false },
  { name: "Волна",             emoji: "🌊",  animationType: "bounce",    rarity: "rare",      stars: 4,  price: 780,   description: "Мощная волна океана",                      primeOnly: false },
  { name: "Гора",              emoji: "🏔️",  animationType: "sparkle",   rarity: "rare",      stars: 3,  price: 720,   description: "Горная вершина — покори её!",              primeOnly: false },
  { name: "Свеча",             emoji: "🕯️",  animationType: "flame",     rarity: "rare",      stars: 4,  price: 880,   description: "Тёплое пламя свечи",                       primeOnly: false },
  { name: "Маска",             emoji: "🎭",  animationType: "magic",     rarity: "rare",      stars: 4,  price: 1050,  description: "Театральная маска двух лиц",               primeOnly: false },
  { name: "Жемчуг",            emoji: "🪬",  animationType: "magic",     rarity: "rare",      stars: 5,  price: 1800,  description: "Жемчужный амулет защиты",                  primeOnly: false },
  { name: "Маяк",              emoji: "🗼",  animationType: "sparkle",   rarity: "rare",      stars: 3,  price: 880,   description: "Маяк в ночи — ориентир для кораблей",      primeOnly: false },
  { name: "Корона",            emoji: "👑",  animationType: "sparkle",   rarity: "rare",      stars: 3,  price: 500,   description: "Почувствуй себя королём",                  primeOnly: false },
  { name: "Красная роза",      emoji: "🌹",  animationType: "hearts",    rarity: "rare",      stars: 3,  price: 750,   description: "Алая роза — символ страсти",               primeOnly: false },
  { name: "Бриллиант",         emoji: "💎",  animationType: "diamonds",  rarity: "rare",      stars: 4,  price: 1000,  description: "Сверкающий бриллиант",                     primeOnly: false },
  { name: "Золотая монета",    emoji: "🪙",  animationType: "sparkle",   rarity: "rare",      stars: 3,  price: 800,   description: "Редкая золотая монета на удачу",           primeOnly: false },
  { name: "Ракета",            emoji: "🚀",  animationType: "lightning", rarity: "rare",      stars: 4,  price: 1250,  description: "В небо и выше!",                           primeOnly: false },
  { name: "Гитара",            emoji: "🎸",  animationType: "sparkle",   rarity: "rare",      stars: 4,  price: 1000,  description: "Рок-н-ролл навсегда",                      primeOnly: false },
  { name: "Кубок",             emoji: "🏆",  animationType: "fireworks", rarity: "rare",      stars: 5,  price: 1750,  description: "Ты настоящий победитель",                  primeOnly: false },
  { name: "Радуга",            emoji: "🌈",  animationType: "confetti",  rarity: "rare",      stars: 4,  price: 880,   description: "Яркая радуга после дождя",                 primeOnly: false },
  { name: "Молния",            emoji: "⚡",  animationType: "lightning", rarity: "rare",      stars: 5,  price: 1500,  description: "Электрическая энергия",                    primeOnly: false },
  { name: "Дельфин",           emoji: "🐬",  animationType: "bounce",    rarity: "rare",      stars: 4,  price: 700,   description: "Игривый и умный дельфин",                  primeOnly: false },
  { name: "Лиса",              emoji: "🦊",  animationType: "bounce",    rarity: "rare",      stars: 3,  price: 620,   description: "Хитрая и обаятельная лиса",                primeOnly: false },
  { name: "Сова",              emoji: "🦉",  animationType: "sparkle",   rarity: "rare",      stars: 4,  price: 840,   description: "Мудрая ночная сова",                       primeOnly: false },
  { name: "Акула",             emoji: "🦈",  animationType: "lightning", rarity: "rare",      stars: 4,  price: 1200,  description: "Грозная хозяйка морей",                    primeOnly: false },
  { name: "Парусник",          emoji: "⛵",  animationType: "bounce",    rarity: "rare",      stars: 3,  price: 900,   description: "Свободный парусник в открытом море",       primeOnly: false },
  { name: "Самоцвет",          emoji: "🏅",  animationType: "sparkle",   rarity: "rare",      stars: 5,  price: 2000,  description: "Редкий самоцвет",                          primeOnly: false },
  { name: "Медаль",            emoji: "🥇",  animationType: "fireworks", rarity: "rare",      stars: 5,  price: 1900,  description: "Золотая медаль за победу",                 primeOnly: false },
  { name: "Попугай",           emoji: "🦜",  animationType: "confetti",  rarity: "rare",      stars: 3,  price: 760,   description: "Яркий тропический попугай",                primeOnly: false },
  { name: "Волшебная лампа",   emoji: "🪔",  animationType: "magic",     rarity: "rare",      stars: 4,  price: 1100,  description: "Лампа Аладдина — исполни желание",         primeOnly: false },
  { name: "Морская звезда",    emoji: "⭐",  animationType: "stars",     rarity: "rare",      stars: 4,  price: 960,   description: "Яркая морская звезда",                     primeOnly: false },
  { name: "Горящее сердце",    emoji: "❤️‍🔥",animationType: "flame",     rarity: "rare",      stars: 5,  price: 1600,  description: "Страстное огненное сердце",                primeOnly: false },

  // ── EPIC (3000–12000 ⚡) ───────────────────────────────────────────────
  { name: "Лев",               emoji: "🦁",  animationType: "flame",     rarity: "epic",      stars: 6,  price: 3200,  description: "Царь зверей, гордый и непобедимый",        primeOnly: false },
  { name: "Тигр",              emoji: "🐯",  animationType: "flame",     rarity: "epic",      stars: 7,  price: 4600,  description: "Полосатый охотник джунглей",               primeOnly: false },
  { name: "Орёл",              emoji: "🦅",  animationType: "lightning", rarity: "epic",      stars: 7,  price: 5400,  description: "Орёл парит выше всех",                     primeOnly: false },
  { name: "Вулкан",            emoji: "🌋",  animationType: "flame",     rarity: "epic",      stars: 8,  price: 6800,  description: "Извергающийся вулкан силы",                primeOnly: false },
  { name: "ДНК жизни",         emoji: "🧬",  animationType: "galaxy",    rarity: "epic",      stars: 7,  price: 4800,  description: "Код жизни — тайна вселенной",              primeOnly: false },
  { name: "Фейерверк",         emoji: "🎆",  animationType: "fireworks", rarity: "epic",      stars: 8,  price: 7200,  description: "Яркий взрыв фейерверка",                   primeOnly: false },
  { name: "Алхимия",           emoji: "⚗️",  animationType: "magic",     rarity: "epic",      stars: 9,  price: 10500, description: "Превратить свинец в золото",               primeOnly: false },
  { name: "Горилла",           emoji: "🦍",  animationType: "flame",     rarity: "epic",      stars: 6,  price: 3400,  description: "Могучая горилла — сила и мудрость",        primeOnly: false },
  { name: "Медуза",            emoji: "🪼",  animationType: "magic",     rarity: "epic",      stars: 7,  price: 5000,  description: "Светящаяся медуза глубин",                 primeOnly: false },
  { name: "Пантера",           emoji: "🐆",  animationType: "lightning", rarity: "epic",      stars: 8,  price: 7600,  description: "Быстрая и смертоносная пантера",           primeOnly: false },
  { name: "Молот Тора",        emoji: "🔨",  animationType: "lightning", rarity: "epic",      stars: 9,  price: 9500,  description: "Молот бога грома",                         primeOnly: false },
  { name: "Паутина",           emoji: "🕸️",  animationType: "magic",     rarity: "epic",      stars: 6,  price: 3600,  description: "Тонкая сеть судьбы",                       primeOnly: false },
  { name: "Дракон",            emoji: "🐉",  animationType: "flame",     rarity: "epic",      stars: 6,  price: 3000,  description: "Могущественный огнедышащий дракон",        primeOnly: false },
  { name: "Единорог",          emoji: "🦄",  animationType: "magic",     rarity: "epic",      stars: 7,  price: 5000,  description: "Магический единорог из легенд",            primeOnly: false },
  { name: "Феникс",            emoji: "🦅",  animationType: "flame",     rarity: "epic",      stars: 7,  price: 6000,  description: "Птица феникс — возрождение",               primeOnly: false },
  { name: "Планета",           emoji: "🪐",  animationType: "galaxy",    rarity: "epic",      stars: 8,  price: 7500,  description: "Далёкая загадочная планета",               primeOnly: false },
  { name: "Волшебство",        emoji: "🪄",  animationType: "magic",     rarity: "epic",      stars: 8,  price: 9000,  description: "Исполни любое желание",                    primeOnly: false },
  { name: "Кристалл",          emoji: "🔮",  animationType: "galaxy",    rarity: "epic",      stars: 9,  price: 12000, description: "Магический предсказательный шар",          primeOnly: false },
  { name: "Пегас",             emoji: "🐎",  animationType: "magic",     rarity: "epic",      stars: 6,  price: 4000,  description: "Крылатый конь богов",                      primeOnly: false },
  { name: "Нарвал",            emoji: "🐋",  animationType: "sparkle",   rarity: "epic",      stars: 7,  price: 4400,  description: "Мифический морской единорог",              primeOnly: false },
  { name: "Хрустальное сердце",emoji: "💠",  animationType: "diamonds",  rarity: "epic",      stars: 8,  price: 7000,  description: "Хрустальное сердце вечной любви",          primeOnly: false },
  { name: "Жар-птица",         emoji: "🔥",  animationType: "flame",     rarity: "epic",      stars: 7,  price: 8000,  description: "Огненная птица из сказок",                 primeOnly: false },
  { name: "Морской конёк",     emoji: "🫀",  animationType: "magic",     rarity: "epic",      stars: 7,  price: 5600,  description: "Волшебный морской конёк",                  primeOnly: false },
  { name: "Грифон",            emoji: "🦁",  animationType: "flame",     rarity: "epic",      stars: 9,  price: 10000, description: "Гордый страж — лев и орёл в одном",       primeOnly: false },
  { name: "Сапфировый кулон",  emoji: "💎",  animationType: "diamonds",  rarity: "epic",      stars: 8,  price: 6400,  description: "Редкий сапфировый кулон",                  primeOnly: false },
  { name: "Магический гриб",   emoji: "🍄",  animationType: "magic",     rarity: "epic",      stars: 6,  price: 3400,  description: "Волшебный гриб из другого мира",           primeOnly: false },
  { name: "Золотая рыбка",     emoji: "🐟",  animationType: "sparkle",   rarity: "epic",      stars: 7,  price: 4200,  description: "Исполняет три желания",                    primeOnly: false },
  { name: "Рубиновое кольцо",  emoji: "💍",  animationType: "hearts",    rarity: "epic",      stars: 8,  price: 8400,  description: "Кольцо с огненным рубином",                primeOnly: false },
  { name: "Волшебная скрипка", emoji: "🎻",  animationType: "magic",     rarity: "epic",      stars: 7,  price: 7800,  description: "Скрипка, играющая сама по себе",           primeOnly: false },
  { name: "Чёрный кот",        emoji: "🐈‍⬛",animationType: "magic",     rarity: "epic",      stars: 6,  price: 5200,  description: "Таинственный чёрный кот с луной",          primeOnly: false },
  { name: "Сфинкс",            emoji: "🏺",  animationType: "galaxy",    rarity: "epic",      stars: 9,  price: 11000, description: "Загадочный страж тайн веков",              primeOnly: false },
  { name: "Огненный дракон",   emoji: "🐲",  animationType: "flame",     rarity: "epic",      stars: 7,  price: 3600,  description: "Дракон, извергающий пламя",                primeOnly: false },

  // ── LEGENDARY (25000–250000 ⚡) ────────────────────────────────────────
  { name: "Метеор",            emoji: "🌠",  animationType: "stars",     rarity: "legendary", stars: 13, price: 28000,  description: "Падающий метеор — загадай желание",        primeOnly: false },
  { name: "Планета Земля",     emoji: "🌍",  animationType: "galaxy",    rarity: "legendary", stars: 16, price: 38000,  description: "Весь наш мир — тебе в подарок",            primeOnly: false },
  { name: "Вечный лёд",        emoji: "🧊",  animationType: "diamonds",  rarity: "legendary", stars: 17, price: 42000,  description: "Ледяной монолит вечности",                 primeOnly: false },
  { name: "Магнит Судьбы",     emoji: "🧲",  animationType: "magic",     rarity: "legendary", stars: 15, price: 45000,  description: "Магнит, притягивающий удачу",              primeOnly: false },
  { name: "Атомный вихрь",     emoji: "☢️",  animationType: "vortex",    rarity: "legendary", stars: 19, price: 75000,  description: "Энергия атомного ядра",                    primeOnly: false },
  { name: "Алмазный скипетр",  emoji: "🪄",  animationType: "diamonds",  rarity: "legendary", stars: 20, price: 85000,  description: "Скипетр из алмазов — власть абсолютна",   primeOnly: false },
  { name: "Сапфировый щит",    emoji: "🛡️",  animationType: "diamonds",  rarity: "legendary", stars: 14, price: 32000,  description: "Сапфировый щит — защита на века",         primeOnly: false },
  { name: "Галактика",         emoji: "🌌",  animationType: "galaxy",    rarity: "legendary", stars: 12, price: 25000,  description: "Целая галактика в твоих руках",            primeOnly: false },
  { name: "Ангел",             emoji: "👼",  animationType: "magic",     rarity: "legendary", stars: 15, price: 50000,  description: "Небесный ангел-хранитель",                 primeOnly: false },
  { name: "Нова",              emoji: "💜",  animationType: "fireworks", rarity: "legendary", stars: 20, price: 100000, description: "Символ мессенджера Nova",                  primeOnly: false },
  { name: "Легендарная звезда",emoji: "🌟",  animationType: "stars",     rarity: "legendary", stars: 25, price: 150000, description: "Легендарная путеводная звезда",            primeOnly: false },
  { name: "Бесконечность",     emoji: "♾️",  animationType: "galaxy",    rarity: "legendary", stars: 50, price: 250000, description: "Бесконечность и далее — высший подарок",  primeOnly: false },
  { name: "Золотой дракон",    emoji: "🐉",  animationType: "galaxy",    rarity: "legendary", stars: 14, price: 30000,  description: "Могущественный золотой дракон удачи",      primeOnly: false },
  { name: "Небесный кит",      emoji: "🐋",  animationType: "galaxy",    rarity: "legendary", stars: 16, price: 36000,  description: "Гигантский кит плывёт в небесах",          primeOnly: false },
  { name: "Северное сияние",   emoji: "🌌",  animationType: "magic",     rarity: "legendary", stars: 17, price: 44000,  description: "Магическое северное сияние",               primeOnly: false },
  { name: "Джинн",             emoji: "🧞",  animationType: "vortex",    rarity: "legendary", stars: 18, price: 60000,  description: "Могущественный джинн исполняет желания",   primeOnly: false },
  { name: "Хрустальный дворец",emoji: "🏰",  animationType: "diamonds",  rarity: "legendary", stars: 19, price: 70000,  description: "Величественный дворец из хрусталя",        primeOnly: false },
  { name: "Единый трон",       emoji: "👑",  animationType: "fireworks", rarity: "legendary", stars: 21, price: 90000,  description: "Трон всех королей и богов",                primeOnly: false },
  { name: "Мировое дерево",    emoji: "🌲",  animationType: "magic",     rarity: "legendary", stars: 15, price: 40000,  description: "Иггдрасиль — ось всего мироздания",        primeOnly: false },
  { name: "Небесный феникс",   emoji: "🦅",  animationType: "supernova", rarity: "legendary", stars: 22, price: 80000,  description: "Феникс, рождённый из звёзд",               primeOnly: false },
  { name: "Нептун",            emoji: "🔱",  animationType: "vortex",    rarity: "legendary", stars: 23, price: 120000, description: "Властелин морей и океанов",                primeOnly: false },
  { name: "Звёздная колесница",emoji: "⭐",  animationType: "stars",     rarity: "legendary", stars: 24, price: 200000, description: "Колесница богов несётся сквозь звёзды",    primeOnly: false },

  // ── COSMIC (300000–2000000 ⚡) ─────────────────────────────────────────
  { name: "Нейтронная звезда", emoji: "💥",  animationType: "supernova", rarity: "cosmic",    stars: 60,  price: 300000,   description: "Сверхплотная звезда с невероятной энергией",primeOnly: false },
  { name: "Квазар",            emoji: "🌠",  animationType: "supernova", rarity: "cosmic",    stars: 75,  price: 500000,   description: "Мощнейший источник света во вселенной",  primeOnly: false },
  { name: "Чёрная дыра",       emoji: "🌀",  animationType: "vortex",    rarity: "cosmic",    stars: 90,  price: 750000,   description: "Точка, из которой нет возврата",          primeOnly: false },
  { name: "Мультивселенная",   emoji: "🪩",  animationType: "vortex",    rarity: "cosmic",    stars: 99,  price: 900000,   description: "Бесконечное множество параллельных миров", primeOnly: false },
  { name: "Абсолют",           emoji: "⚜️",  animationType: "supernova", rarity: "cosmic",    stars: 100, price: 1000000,  description: "Абсолютное совершенство — предел возможного",primeOnly: false },
  { name: "Сингулярность",     emoji: "💠",  animationType: "vortex",    rarity: "cosmic",    stars: 150, price: 1500000,  description: "Точка начала всего — бесконечная плотность бытия",primeOnly: false },
  { name: "Создатель",         emoji: "🌐",  animationType: "supernova", rarity: "cosmic",    stars: 200, price: 2000000,  description: "Высший подарок вселенной",                primeOnly: false },
  { name: "Вселенский огонь",  emoji: "🔥",  animationType: "supernova", rarity: "cosmic",    stars: 80,  price: 600000,   description: "Первичный огонь начала всего",            primeOnly: false },
  { name: "Бог Грома",         emoji: "⚡",  animationType: "lightning", rarity: "cosmic",    stars: 70,  price: 400000,   description: "Громовержец — повелитель молний",         primeOnly: false },
  { name: "Ось Мира",          emoji: "⚖️",  animationType: "galaxy",    rarity: "cosmic",    stars: 65,  price: 350000,   description: "Незримая ось, на которой держится вселенная",primeOnly: false },
  { name: "Левиафан",          emoji: "🐉",  animationType: "vortex",    rarity: "cosmic",    stars: 88,  price: 700000,   description: "Библейское чудовище глубин",              primeOnly: false },
  { name: "Солнечный дракон",  emoji: "🌞",  animationType: "supernova", rarity: "cosmic",    stars: 77,  price: 560000,   description: "Дракон, рождённый в короне солнца",       primeOnly: false },
  { name: "Вечность",          emoji: "♾️",  animationType: "galaxy",    rarity: "cosmic",    stars: 95,  price: 840000,   description: "Бесконечное течение времени",             primeOnly: false },
  { name: "Первозданный Хаос", emoji: "💫",  animationType: "vortex",    rarity: "cosmic",    stars: 98,  price: 960000,   description: "До слова «да будет свет» был Хаос",       primeOnly: false },
  { name: "Высший Разум",      emoji: "🔮",  animationType: "supernova", rarity: "cosmic",    stars: 110, price: 1100000,  description: "Сознание, пронизывающее всё сущее",       primeOnly: false },

  // ── PRIME EXCLUSIVE ────────────────────────────────────────────────────
  { name: "Корона Prime",      emoji: "👑",  animationType: "magic",     rarity: "epic",      stars: 10, price: 10000,  description: "Эксклюзивная корона для избранных Prime-участников",  primeOnly: true },
  { name: "Пульс Сердца",      emoji: "💜",  animationType: "hearts",    rarity: "legendary", stars: 18, price: 60000,  description: "Бьющийся пульс — символ вечной связи Prime",           primeOnly: true },
  { name: "Звезда Prime",      emoji: "⭐",  animationType: "stars",     rarity: "legendary", stars: 22, price: 110000, description: "Эксклюзивная звезда — только для Prime-участников",    primeOnly: true },
  { name: "Вселенский Огонь",  emoji: "🔥",  animationType: "flame",     rarity: "cosmic",    stars: 80, price: 600000, description: "Огонь, что горит вечно — особый дар Prime",            primeOnly: true },
  { name: "Сапфировый Трон",   emoji: "💎",  animationType: "galaxy",    rarity: "cosmic",    stars: 85, price: 240000, description: "Трон из сапфира для истинных Prime-небожителей",       primeOnly: true },
];

const SYSTEM_USERS: Array<{
  username: string;
  displayName: string;
  avatarColor: string;
  avatarUrl?: string;
  isBot?: boolean;
  isVerified?: boolean;
  isAdmin?: boolean;
  status: string;
  passwordHash: string;
}> = [
  {
    username: "creater_messenger",
    displayName: "creater_messenger",
    avatarColor: "#F59E0B",
    isBot: false,
    isVerified: true,
    isAdmin: true,
    status: "online",
    // bcrypt hash of "pulse2024" — never change this automatically
    passwordHash: "$2b$12$ejJ4JyOdHbph7ETga8QpdeJTzN28FDCNZ3tw.1B1d/936/2ZDZ/fa",
  },
  {
    username: "nova_ai",
    displayName: "Nova AI",
    avatarColor: "#5B6CF9",
    avatarUrl: null,
    isBot: true,
    isVerified: true,
    isAdmin: false,
    status: "online",
    passwordHash: "$2b$12$ejJ4JyOdHbph7ETga8QpdeJTzN28FDCNZ3tw.1B1d/936/2ZDZ/fa",
  },
];

export async function runSeed() {
  // ── 1. Bulk-upsert gift catalog (single query instead of 300+) ────────────
  if (GIFT_CATALOG.length > 0) {
    const values = GIFT_CATALOG.map(item =>
      sql`(${item.name}, ${item.emoji}, ${item.animationType}, ${item.rarity},
           ${item.stars}, ${item.price}, ${item.description}, ${item.primeOnly})`
    );

    await db.execute(sql`
      INSERT INTO gift_items (name, emoji, animation_type, rarity, stars, price, description, prime_only)
      VALUES ${sql.join(values, sql`, `)}
      ON CONFLICT (name) DO UPDATE SET
        emoji          = EXCLUDED.emoji,
        animation_type = EXCLUDED.animation_type,
        rarity         = EXCLUDED.rarity,
        stars          = EXCLUDED.stars,
        price          = EXCLUDED.price,
        description    = EXCLUDED.description,
        prime_only     = EXCLUDED.prime_only
    `);

    const total = await db.execute(sql`SELECT COUNT(*) as cnt FROM gift_items`);
    console.log(`[seed] Gift catalog: ${(total.rows[0] as any).cnt} items`);
  }

  // ── 2. Ensure system users exist ──────────────────────────────────────────
  for (const u of SYSTEM_USERS) {
    const rows = await db.execute(sql`SELECT id FROM users WHERE username = ${u.username} LIMIT 1`);
    if ((rows.rows as any[]).length === 0) {
      await db.execute(sql`
        INSERT INTO users (username, display_name, avatar_color, avatar_url, status, is_bot, is_verified, is_admin, password_hash, balance)
        VALUES (
          ${u.username}, ${u.displayName}, ${u.avatarColor}, ${u.avatarUrl ?? null}, ${u.status},
          ${u.isBot ?? false}, ${u.isVerified ?? false}, ${u.isAdmin ?? false},
          ${u.passwordHash}, 0
        )
      `);
      console.log(`[seed] Created user: ${u.username}`);
    } else if (u.avatarUrl) {
      await db.execute(sql`
        UPDATE users SET avatar_url = ${u.avatarUrl}, display_name = ${u.displayName}, avatar_color = ${u.avatarColor}
        WHERE username = ${u.username}
      `);
    }
  }

  // ── 3. Ensure the official Aura channel exists ───────────────────────────
  const adminRow = await db.execute(sql`SELECT id FROM users WHERE username = 'creater_messenger' LIMIT 1`);
  const adminId = (adminRow.rows as any[])[0]?.id;
  if (adminId) {
    // Rename any stale 'Nova' channel to 'Aura'
    await db.execute(sql`
      UPDATE chats SET name = 'Aura', description = 'Официальный канал Aura Messenger'
      WHERE type = 'channel' AND name = 'Nova'
    `);

    const existingChannel = await db.execute(sql`SELECT id FROM chats WHERE type = 'channel' AND name = 'Aura' LIMIT 1`);
    if ((existingChannel.rows as any[]).length === 0) {
      const channelResult = await db.execute(sql`
        INSERT INTO chats (type, name, description, avatar_color)
        VALUES ('channel', 'Aura', 'Официальный канал Aura Messenger', '#f97316')
        RETURNING id
      `);
      const channelId = (channelResult.rows as any[])[0]?.id;
      if (channelId) {
        await db.execute(sql`
          INSERT INTO chat_members (chat_id, user_id, role)
          VALUES (${channelId}, ${adminId}, 'owner')
          ON CONFLICT DO NOTHING
        `);
        await db.execute(sql`
          INSERT INTO chat_members (chat_id, user_id, role)
          SELECT ${channelId}, id, 'member' FROM users
          WHERE id != ${adminId} AND is_bot = false
          ON CONFLICT DO NOTHING
        `);
        console.log(`[seed] Created official Aura channel (id=${channelId})`);
      }
    } else {
      const channelId = (existingChannel.rows as any[])[0]?.id;
      await db.execute(sql`
        INSERT INTO chat_members (chat_id, user_id, role)
        VALUES (${channelId}, ${adminId}, 'owner')
        ON CONFLICT (chat_id, user_id) DO UPDATE SET role = 'owner'
      `);
      await db.execute(sql`
        INSERT INTO chat_members (chat_id, user_id, role)
        SELECT ${channelId}, id, 'member' FROM users
        WHERE id != ${adminId} AND is_bot = false
        ON CONFLICT DO NOTHING
      `);
    }
  }
}
