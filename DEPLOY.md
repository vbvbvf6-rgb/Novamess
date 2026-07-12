# Деплой Nova: Vercel (фронтенд) + Render (бэкенд)

## Архитектура

```
Пользователь
    │
    ├─► Vercel ──── React/Vite фронтенд (CDN, быстро)
    │
    └─► Render ──── Express API + Socket.IO + PostgreSQL
```

Фронтенд знает адрес бэкенда через переменную `VITE_API_URL`.

---

## Шаг 1. Бэкенд — Render (без карты)

### 1.1 База данных — Supabase

1. [supabase.com](https://supabase.com) → **Start your project** (GitHub, без карты)
2. **New project** → имя, пароль, регион **Frankfurt**
3. Подожди ~2 минуты
4. **Settings → Database → Connection string → Transaction** (вкладка) → скопируй:
   ```
   postgresql://postgres.xxxx:ПАРОЛЬ@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
   ```

### 1.2 Деплой API-сервера — Render

1. [render.com](https://render.com) → Sign Up (GitHub, без карты)
2. **New → Web Service**
3. Подключи GitHub репозиторий

| Поле | Значение |
|------|----------|
| **Runtime** | Node |
| **Build Command** | `npm install -g pnpm@10 && pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server run build` |
| **Start Command** | `node --enable-source-maps ./artifacts/api-server/dist/index.mjs` |
| **Instance Type** | Free |

4. **Environment** → добавь:

| Ключ | Значение |
|------|----------|
| `DATABASE_URL` | Строка из Supabase |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | Нажми «Generate» или вставь 64 случайных символа |

5. **Create Web Service** → дождись деплоя (~5 мин)
6. Запомни URL сервиса: `https://nova-api.onrender.com` ← это `VITE_API_URL`

---

## Шаг 2. Фронтенд — Vercel (без карты)

1. [vercel.com](https://vercel.com) → Sign Up (GitHub, без карты)
2. **Add New → Project** → импортируй тот же GitHub репозиторий
3. Vercel сам найдёт `vercel.json` в корне репозитория

### Настройки проекта (если Vercel спросит)

| Поле | Значение |
|------|----------|
| **Framework Preset** | Other |
| **Root Directory** | `.` (корень) |
| **Build Command** | *(берётся из vercel.json автоматически)* |
| **Output Directory** | *(берётся из vercel.json автоматически)* |

### Переменные окружения

В Vercel → **Settings → Environment Variables** добавь:

| Ключ | Значение |
|------|----------|
| `VITE_API_URL` | URL твоего Render сервиса, например `https://nova-api.onrender.com` |

> ⚠️ Без `VITE_API_URL` фронтенд не будет знать где бэкенд и ничего не заработает.

4. **Deploy** → Vercel соберёт и задеплоит (~3–5 мин)

---

## Шаг 3. Не давать Render засыпать — cron-job.org

Render Free засыпает через 15 минут без запросов.

1. [cron-job.org](https://cron-job.org) → Sign Up → **Create cronjob**
2. URL: `https://nova-api.onrender.com/api/healthz`
3. Schedule: **Every 14 minutes** → Save

---

## Шаг 4. Объектное хранилище для медиа (чтобы база не заканчивалась)

По умолчанию фото/видео/голосовые/аватары/истории сохраняются прямо в Postgres как base64. Это удобно для старта, но база (Supabase Free — 500 МБ) заполняется очень быстро — один видеофайл "весит" в базе больше, чем сам файл. Чтобы это исправить один раз и навсегда, подключи S3-совместимое хранилище.

Подходит любой провайдер с S3 API — можно начать с бесплатного и позже сменить без изменения кода и без потери данных (старые файлы просто останутся там, где были загружены):

- **Cloudflare R2** — 10 ГБ бесплатно, дальше $0.015/ГБ/мес, без платы за исходящий трафик. Рекомендуется.
- Backblaze B2, Supabase Storage (S3-режим), Wasabi, AWS S3 — тоже подходят.

### Настройка (пример для Cloudflare R2)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **R2** → **Create bucket** → включи Public Access (или подключи домен/CDN).
2. **Manage API tokens** → создай токен с правами Read & Write на этот bucket → сохрани Access Key ID и Secret Access Key.
3. В Render → **Environment** добавь:

| Ключ | Значение |
|------|----------|
| `S3_ENDPOINT` | `https://<account_id>.r2.cloudflarestorage.com` |
| `S3_BUCKET` | имя bucket |
| `S3_ACCESS_KEY_ID` | из API-токена |
| `S3_SECRET_ACCESS_KEY` | из API-токена |
| `S3_PUBLIC_URL_BASE` | публичный URL bucket (или домен/CDN перед ним), без слеша на конце |

4. **Manual Deploy** на Render — после этого все новые файлы будут уходить в R2, а в базе останется только ссылка.

### Перенос уже загруженных файлов (уменьшить текущий размер базы)

После того как переменные добавлены и сервис перезапущен, один раз выполни у себя локально (или в Replit Shell, откуда деплоится проект):

```bash
DATABASE_URL=... S3_ENDPOINT=... S3_BUCKET=... S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=... S3_PUBLIC_URL_BASE=... \
pnpm --filter @workspace/scripts run migrate-media
```

Скрипт находит все существующие base64-файлы в базе, загружает их в хранилище и заменяет содержимое колонки на ссылку. После — выполни `VACUUM FULL;` в Supabase SQL Editor, чтобы Postgres освободил физическое место на диске.

### Смена базы данных без потери данных

Если база (Supabase/Neon/что угодно) когда-нибудь заполнится или понадобится сменить провайдера — это стандартный Postgres, доступный через `DATABASE_URL`, так что перенос делается штатными средствами Postgres, без миграции кода:

```bash
pg_dump "$OLD_DATABASE_URL" -Fc -f backup.dump
pg_restore -d "$NEW_DATABASE_URL" backup.dump
```

Затем просто обновляешь `DATABASE_URL` в Render на новую строку подключения и делаешь Manual Deploy. Пользователи, чаты, история — всё сохраняется, потому что вынесенные в объектное хранилище файлы вообще не зависят от того, какая база данных используется.

---

## Итог

| URL | Что |
|-----|-----|
| `https://nova-messenger.vercel.app` | Твой мессенджер (фронтенд) |
| `https://nova-api.onrender.com` | API-сервер (бэкенд) |

---

## Частые ошибки

### Белый экран / "Failed to fetch"
`VITE_API_URL` не задан в Vercel или задан неправильно.
- Проверь: Vercel → Settings → Environment Variables
- URL должен быть **без слеша в конце**: `https://nova-api.onrender.com` ✅ `https://nova-api.onrender.com/` ❌
- После изменения переменной → **Redeploy**

### `DATABASE_URL must be set` на Render
Переменная не добавлена в Render → Environment.
Добавь `DATABASE_URL` → **Save Changes** → **Manual Deploy**

### Звонки не работают (нет звука)
Встроенный TURN-сервер (openrelay) работает без регистрации.
Если всё равно не слышат друг друга — это проблема с сетью/NAT.
Можно улучшить добавив бесплатный TURN от [expressturn.com](https://expressturn.com) (только email, без карты):
- Render Environment: `TURN_URL`, `TURN_USER`, `TURN_CRED`

### Build failed на Vercel: "pnpm not found"
Vercel должен установить pnpm через build command.
Убедись что build command в `vercel.json` начинается с `npm install -g pnpm@10 &&`

### CORS ошибки в консоли браузера
Бэкенд уже настроен принимать запросы с любого домена (`cors: origin: true`).
Если видишь CORS — проверь что `VITE_API_URL` указывает на правильный Render URL.
