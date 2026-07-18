// Nova Messenger — Wispbyte startup (pre-built, no compilation needed)
const { execSync } = require("child_process");

function run(cmd, label) {
  console.log(`\n[Nova] ${label}...`);
  execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
}

// Установить только prod-зависимости API сервера (легко, ~50 пакетов)
run(
  "npm install --prefix artifacts/api-server --omit=dev 2>/dev/null || true",
  "Устанавливаем зависимости сервера"
);

// Применить миграции и запустить готовый билд
run("bash scripts/start-prod.sh", "Запускаем сервер");
