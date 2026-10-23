const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const packageRoot = path.resolve(__dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
const sdkRoot = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME;

if (!sdkRoot) {
  throw new Error("Set ANDROID_SDK_ROOT or ANDROID_HOME to the installed Android SDK.");
}

const env = {
  ...process.env,
  ANDROID_HOME: sdkRoot,
  ANDROID_SDK_ROOT: sdkRoot,
  VITE_API_URL: process.env.VITE_API_URL || "https://novamess.wispbyte.app",
};
delete env.REPLIT_DEV_DOMAIN;
delete env.SERVER_URL;

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
}

run("pnpm", ["run", "cap:build"], packageRoot);
run(
  process.platform === "win32" ? "gradlew.bat" : "./gradlew",
  ["--no-daemon", "--console=plain", "assembleDebug"],
  path.join(packageRoot, "android"),
);

const sourceApk = path.join(
  packageRoot,
  "android",
  "app",
  "build",
  "outputs",
  "apk",
  "debug",
  "app-debug.apk",
);
const outputDir = path.resolve(packageRoot, "../../generated-artifacts/android");
const outputApk = path.join(outputDir, `Nova-Messenger-${packageJson.version}-debug.apk`);

fs.mkdirSync(outputDir, { recursive: true });
fs.copyFileSync(sourceApk, outputApk);
console.log(`APK created: ${outputApk}`);
