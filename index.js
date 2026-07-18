// Nova Messenger — Wispbyte startup file (CommonJS)
const { execSync } = require("child_process");

function run(cmd, label) {
  console.log(`\n[Nova] ${label}...`);
  execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
}

// Установить pnpm если нет
try {
  execSync("pnpm --version", { stdio: "ignore" });
  console.log("[Nova] pnpm уже установлен");
} catch {
  run("npm install -g pnpm@10", "Устанавливаем pnpm");
}

// Установить зависимости
run("pnpm install --frozen-lockfile", "Устанавливаем зависимости");

// Собрать фронтенд
run(
  "PORT=5000 BASE_PATH=/ pnpm --filter @workspace/pulse run build",
  "Собираем фронтенд"
);

// Собрать API-сервер
run("pnpm --filter @workspace/api-server run build", "Собираем API-сервер");

// Применить миграции БД и запустить сервер
run("bash scripts/start-prod.sh", "Запускаем сервер");
