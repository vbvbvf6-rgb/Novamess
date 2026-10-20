# Деплой Nova

---

## H1Cloud.net: первый запуск и автодеплой из GitHub

H1Cloud.net предоставляет облачный сервер (VPS) с консолью, переменными
окружения и автозапуском. На сайте не удалось подтвердить встроенную GitHub
интеграцию, поэтому в проект добавлен GitHub Actions-деплой по SSH: он
передаёт файлы выбранной ветки на сервер, собирает фронтенд и API и
перезапускает уже созданный процесс. ZIP вручную скачивать не потребуется.

### Один раз на сервере H1Cloud

1. Создайте Linux-сервер H1Cloud с Node.js 20+ и достаточной памятью. Для
   мессенджера также нужна доступная PostgreSQL-база: `DATABASE_URL`.
2. Установите `pnpm` 10 и `pm2`, создайте папку проекта (например,
   `/opt/nova-messenger`) и добавьте SSH-ключ GitHub Actions в `authorized_keys`
   пользователя сервера.
3. Добавьте серверные переменные из `.env.example` в настройках H1Cloud либо
   создайте файл `.env` в папке проекта на сервере. Файл `.env` загружается
   при старте и исключён из Git. Обязательны `DATABASE_URL` и `JWT_SECRET`
   (либо `SESSION_SECRET`). Не вставляйте реальные секреты в `.env.example`
   или другие отслеживаемые GitHub файлы.
4. Добавьте GitHub Actions Secrets и Variables, перечисленные ниже. После
   этого каждый push в `main` сам передаст исходники, соберёт фронтенд/API и
   перезапустит приложение. Первый запуск можно выполнить вручную через
   **Actions → Deploy to H1Cloud → Run workflow**.

   ```bash
   cd /opt/nova-messenger
   pm2 start scripts/start-prod.sh --name nova-messenger --interpreter bash
   pm2 save
   ```

   В панели H1Cloud настройте автозапуск `pm2 resurrect` после перезагрузки
   сервера и проксирование публичного HTTP-порта на порт приложения (`8080`,
   если H1Cloud не задаёт `PORT`).

### Настройка GitHub Actions

В GitHub → **Settings → Secrets and variables → Actions** добавьте:

- Secrets: `H1CLOUD_HOST`, `H1CLOUD_USER`, `H1CLOUD_SSH_PRIVATE_KEY`,
  `H1CLOUD_KNOWN_HOSTS`.
- Variables: `H1CLOUD_APP_DIR` (например, `/opt/nova-messenger`) и
  `H1CLOUD_SSH_PORT` (необязательно, по умолчанию `22`).

`H1CLOUD_KNOWN_HOSTS` — проверенный публичный ключ SSH-сервера H1Cloud, а
`H1CLOUD_SSH_PRIVATE_KEY` — закрытый ключ пользователя, которому разрешён
доступ на сервер. Добавьте только открытый ключ в `authorized_keys`.
Не вставляйте закрытый ключ в чат или файлы проекта.

Файл `.env` на сервере и переменные в панели H1Cloud не перезаписываются
автодеплоем. Для другой ветки измените `branches` в
`.github/workflows/deploy-h1cloud.yml`.
`VITE_API_URL` оставьте пустым: фронтенд и API обслуживаются одним сервером.

## ⭐ Бэкенд — Fly.io (бесплатно навсегда)

**Fly.io** — лучший бесплатный вариант для Socket.IO: 3 VM в подарок, не спит, нет cold starts.

### Первый деплой

```bash
# 1. Установи flyctl
curl -L https://fly.io/install.sh | sh

# 2. Войди в аккаунт (GitHub или email)
flyctl auth login

# 3. Создай приложение (первый раз)
flyctl launch --no-deploy
# При вопросе "Would you like to deploy now?" — ответь No

# 4. Установи секреты
flyctl secrets set \
  DATABASE_URL="postgresql://..." \
  JWT_SECRET="$(openssl rand -hex 32)" \
  VAPID_PUBLIC_KEY="..." \
  VAPID_PRIVATE_KEY="..." \
  VAPID_EMAIL="mailto:admin@nova.app" \
  FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'

# 5. Задеплой
flyctl deploy
```

Готово — твой API будет на `https://nova-api.fly.dev` (или другое имя из fly.toml).

### Автодеплой при push

Добавь секрет `FLY_API_TOKEN` в GitHub (Settings → Secrets).  
GitHub Actions workflow `.github/workflows/deploy-fly.yml` деплоит автоматически.

### Получить FLY_API_TOKEN
```bash
flyctl tokens create deploy -x 999999h
```

---

## Деплой Nova: Pxxl (фронтенд + бэкенд)

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
