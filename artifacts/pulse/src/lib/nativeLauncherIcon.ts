import { Capacitor, registerPlugin } from "@capacitor/core";

interface LauncherIconPlugin {
  setIcon(options: { name: string }): Promise<{ name: string }>;
}

const LauncherIcon = registerPlugin<LauncherIconPlugin>("LauncherIcon");

export async function setNativeLauncherIcon(name: string): Promise<boolean> {
  if (Capacitor.getPlatform() !== "android") return false;
  await LauncherIcon.setIcon({ name });
  return true;
}
