# Настройка Firebase для push-уведомлений в APK

Без Firebase APK не получает уведомления когда приложение закрыто.
Это занимает ~10 минут.

---

## Шаг 1. Создай Firebase проект

1. Зайди на [console.firebase.google.com](https://console.firebase.google.com)
2. **Add project** → название: `nova-messenger` → Continue
3. Google Analytics — можно отключить → **Create project**

---

## Шаг 2. Добавь Android приложение

1. На главной странице проекта нажми **Android** (иконка)
2. Заполни:
   | Поле | Значение |
   |------|----------|
   | Android package name | `com.pulse.messenger` |
   | App nickname | `Nova` |
   | SHA-1 | (оставь пустым) |
3. **Register app**
4. **Скачай `google-services.json`** — это важный файл!
5. Нажимай Continue → Continue → **Continue to console** (SDK добавлять не нужно)

---

## Шаг 3. Добавь `google-services.json` в GitHub

Этот файл нужен GitHub Actions для сборки APK с FCM.

1. Открой скачанный `google-services.json` в текстовом редакторе
2. Скопируй всё содержимое
3. Зайди в GitHub: Settings → Secrets and variables → Actions → **New repository secret**
4. Name: `GOOGLE_SERVICES_JSON`
5. Value: вставь скопированный JSON
6. **Add secret**

---

## Шаг 4. Настрой бэкенд для отправки FCM

Серверу нужен ключ Service Account для отправки уведомлений.

1. В Firebase Console: ⚙️ Project Settings → **Service accounts**
2. **Generate new private key** → скачай JSON файл
3. Открой в текстовом редакторе, скопируй всё содержимое
4. Добавь в хостинг бэкенда (Fly.io):
   ```bash
   flyctl secrets set FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...весь JSON одной строкой...}'
   ```
   
   Или через Fly.io Dashboard → App → Secrets → Add secret:
   - Key: `FIREBASE_SERVICE_ACCOUNT`
   - Value: всё содержимое JSON файла

---

## Шаг 5. Собери APK через GitHub Actions

1. Зайди в GitHub репозиторий → **Actions**
2. Слева выбери **Build Android APK**
3. **Run workflow** → укажи URL бэкенда (например `https://nova-api.fly.dev`)
4. Дожди (~5–10 мин) → скачай APK из раздела **Artifacts**

---

## Итог

| Компонент | Что делает |
|-----------|------------|
| `google-services.json` в GitHub Secrets | APK умеет регистрироваться в FCM |
| `FIREBASE_SERVICE_ACCOUNT` на Fly.io | Бэкенд умеет отправлять пуши через FCM |
| `@capacitor/push-notifications` | Получение токена и показ уведомлений в APK |

---

## Как работает после настройки

1. Пользователь устанавливает APK и входит в аккаунт
2. APK получает FCM-токен и отправляет его на бэкенд (`POST /api/push/fcm-token`)
3. Когда кто-то пишет сообщение — бэкенд отправляет уведомление через Google FCM
4. Google FCM доставляет уведомление на устройство — **даже если APK полностью закрыт**

---

## Бесплатность

Firebase FCM полностью бесплатен — без лимитов на сообщения.
