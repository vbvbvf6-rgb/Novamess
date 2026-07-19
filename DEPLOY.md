# Деплой Nova: Pxxl (фронтенд + бэкенд)

## Архитектура

```
Пользователь
    │
    ├─► Pxxl ──── React/Vite фронтенд (статический сайт)
    │
    └─► Pxxl ──── Express API + Socket.IO (always-on, без cold starts)
```

Фронтенд знает адрес бэкенда через переменную `VITE_API_URL`.

> **Почему Pxxl, а не Vercel для бэкенда?**
> Vercel — serverless, каждый запрос живёт секунды. Socket.IO требует
> постоянного соединения, поэтому real-time (чаты, звонки, статусы)
> работает только на always-on платформах. Pxxl держит сервер всегда живым.

---

## Важно: модель выполнения

Оба проекта на Pxxl (бэкенд и фронтенд) используют **один репозиторий** и **одну
корневую директорию — `.` (корень репо)**. Все команды запускаются из корня,
pnpm workspace-фильтры выбирают нужный пакет. Никогда не указывай
`artifacts/api-server` или `artifacts/pulse` как Root Directory в Pxxl — иначе
workspace-зависимости не найдутся.

---

## Шаг 0. Требования

- Аккаунт на [pxxl.app](https://pxxl.app) (Sign Up через GitHub — бесплатно)
- GitHub репозиторий с этим кодом

---

## Шаг 1. База данных — Supabase

1. [supabase.com](https://supabase.com) → **Start your project** (GitHub, без карты)
2. **New project** → имя, пароль, регион **Frankfurt**
3. Подожди ~2 минуты
4. **Settings → Database → Connection string → Transaction** → скопируй:
   ```
   postgresql://postgres.xxxx:ПАРОЛЬ@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
   ```

---

## Шаг 2. Бэкенд — Pxxl (API Server)

1. [pxxl.app/dashboard](https://pxxl.app/dashboard) → **Deploy Project**
2. Выбери GitHub репозиторий → **Import**
3. Настройки:

| Поле | Значение |
|------|----------|
| **Project Name** | `nova-api` |
| **Root Directory** | `.` (корень репозитория) |
| **Install Command** | `npm install -g pnpm@10 && pnpm install --frozen-lockfile` |
| **Build Command** | `pnpm --filter @workspace/api-server run build` |
| **Start Command** | `node --enable-source-maps ./artifacts/api-server/dist/index.mjs` |
| **Type** | Web Service (Node.js) |

> Файл `pxxl.toml` в корне репо заполнит эти поля автоматически — проверь что они верны.

4. **Environment Variables** → добавь:

| Ключ | Значение |
|------|----------|
| `DATABASE_URL` | Строка из Supabase |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | 64 случайных символа (`openssl rand -hex 32`) |

> `PORT` **не добавляй** — Pxxl устанавливает его автоматически.

5. **Deploy** → дождись завершения (~3–5 мин)
6. Запомни URL: `https://nova-api.pxxl.app` — это значение `VITE_API_URL`

---

## Шаг 3. Фронтенд — Pxxl (Pulse)

1. [pxxl.app/dashboard](https://pxxl.app/dashboard) → **Deploy Project** (новый проект)
2. Выбери **тот же** репозиторий → **Import**
3. Настройки:

| Поле | Значение |
|------|----------|
| **Project Name** | `nova-app` |
| **Root Directory** | `.` (корень репозитория) |
| **Install Command** | `npm install -g pnpm@10 && pnpm install --frozen-lockfile` |
| **Build Command** | `BASE_PATH=/ pnpm --filter @workspace/pulse run build` |
| **Output Directory** | `artifacts/pulse/dist` |
| **Type** | Static Site |

4. **Environment Variables** → добавь:

| Ключ | Значение |
|------|----------|
| `VITE_API_URL` | URL бэкенда из Шага 2, например `https://nova-api.pxxl.app` |

> ⚠️ Без `VITE_API_URL` фронтенд не знает где бэкенд — ничего работать не будет.

5. **Deploy** → ~3–5 мин

---

## Шаг 4. Объектное хранилище для медиа (рекомендуется)

По умолчанию фото/видео/аватары сохраняются в Postgres как base64.
Supabase Free даёт 500 МБ — один видеофайл занимает сотни MB.

### Cloudflare R2 (бесплатно 10 ГБ)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **R2** → **Create bucket** → включи Public Access
2. **Manage API tokens** → Read & Write на bucket → сохрани Access Key ID и Secret
3. В Pxxl → проект бэкенда → **Environment Variables** добавь:

| Ключ | Значение |
|------|----------|
| `S3_ENDPOINT` | `https://<account_id>.r2.cloudflarestorage.com` |
| `S3_BUCKET` | имя bucket |
| `S3_ACCESS_KEY_ID` | из токена |
| `S3_SECRET_ACCESS_KEY` | из токена |
| `S3_PUBLIC_URL_BASE` | публичный URL bucket (без слеша на конце) |

4. Redeploy бэкенда

---

## Итог

| URL | Что |
|-----|-----|
| `https://nova-app.pxxl.app` | Мессенджер (фронтенд) |
| `https://nova-api.pxxl.app` | API-сервер (бэкенд) |

---

## Частые ошибки

### Белый экран / "Failed to fetch"
- Проверь `VITE_API_URL` в настройках фронтенд-проекта на Pxxl
- URL **без слеша** в конце: `https://nova-api.pxxl.app` ✅
- После изменения переменной → **Redeploy**

### `PORT environment variable is required`
- Удали `PORT` из Environment Variables — Pxxl выставляет его сам

### `DATABASE_URL must be set`
- Добавь `DATABASE_URL` в бэкенд-проект → **Save** → **Redeploy**

### Build failed: "pnpm not found"
- Install Command должен начинаться с `npm install -g pnpm@10 &&`

### CORS ошибки
- Бэкенд принимает запросы с любого домена — если видишь CORS,
  проблема в неправильном `VITE_API_URL`

### Звонки не работают (нет звука)
Добавь бесплатный TURN от [expressturn.com](https://expressturn.com):

| Ключ | Значение |
|------|----------|
| `TURN_URL` | URL от expressturn |
| `TURN_USER` | username |
| `TURN_CRED` | credential |
