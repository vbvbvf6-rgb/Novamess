const { spawnSync } = require("node:child_process");
const path = require("node:path");

const packageRoot = path.resolve(__dirname, "..");
const env = {
  ...process.env,
  VITE_API_URL: process.env.VITE_API_URL || "https://novamess.wispbyte.app",
  ELECTRON_BUILDER_COMPRESSION_LEVEL: process.env.ELECTRON_BUILDER_COMPRESSION_LEVEL || "1",
};
const packageManager = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function run(args) {
  const result = spawnSync(packageManager, args, {
    cwd: packageRoot,
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${packageManager} ${args.join(" ")} failed with exit code ${result.status}`);
  }
}

run(["run", "build"]);
run(["exec", "electron-builder", "--win", "nsis", "--x64"]);
