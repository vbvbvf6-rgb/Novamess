import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.aura.messenger",
  appName: "Nova",
  webDir: "dist",
  server: {
    url: process.env.SERVER_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : undefined),
    cleartext: false,
  },
  android: {
    backgroundColor: "#0d0f14",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#0d0f14",
      showSpinner: false,
    },
  },
};

export default config;
