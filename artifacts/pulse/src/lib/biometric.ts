const BIOMETRIC_ENABLED_KEY = "nova-biometric-enabled";
const BIOMETRIC_CREDENTIAL_KEY = "nova-biometric-credential";

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

export function isBiometricEnabled(): boolean {
  return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === "1"
    && !!localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY);
}

export function isBiometricSupported(): boolean {
  return typeof window !== "undefined"
    && typeof window.PublicKeyCredential !== "undefined"
    && !!navigator.credentials
    && window.isSecureContext;
}

export async function registerBiometric(user: { username?: string; displayName?: string }): Promise<void> {
  if (!isBiometricSupported()) throw new Error("unsupported");

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: "Nova Messenger", id: window.location.hostname },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)),
        name: user.username || "nova-user",
        displayName: user.displayName || "Nova user",
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
      },
      timeout: 60_000,
    },
  });

  if (!(credential instanceof PublicKeyCredential)) throw new Error("cancelled");
  localStorage.setItem(BIOMETRIC_CREDENTIAL_KEY, toBase64(new Uint8Array(credential.rawId)));
  localStorage.setItem(BIOMETRIC_ENABLED_KEY, "1");
}

export async function authenticateBiometric(): Promise<boolean> {
  if (!isBiometricSupported()) return false;
  const encodedId = localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY);
  if (!encodedId) return false;

  try {
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rpId: window.location.hostname,
        allowCredentials: [{
          type: "public-key",
          id: fromBase64(encodedId),
        }],
        userVerification: "required",
        timeout: 60_000,
      },
    });
    return credential instanceof PublicKeyCredential;
  } catch {
    return false;
  }
}

export function disableBiometric() {
  localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
  localStorage.removeItem(BIOMETRIC_CREDENTIAL_KEY);
}