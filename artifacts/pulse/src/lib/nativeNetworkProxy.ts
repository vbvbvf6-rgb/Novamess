import { Capacitor, registerPlugin } from "@capacitor/core";

export type NetworkProxyType = "http" | "socks5";

export interface NativeNetworkProxySettings {
  supported: boolean;
  enabled: boolean;
  type: NetworkProxyType;
  host: string;
  port: number;
}

interface NetworkProxyPlugin {
  getSettings(): Promise<NativeNetworkProxySettings>;
  setProxy(options: {
    type: NetworkProxyType;
    host: string;
    port: number;
  }): Promise<{ enabled: boolean }>;
  clearProxy(): Promise<{ enabled: boolean }>;
}

export const NetworkProxy = registerPlugin<NetworkProxyPlugin>("NetworkProxy");

export function isAndroidNativeApp(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}
