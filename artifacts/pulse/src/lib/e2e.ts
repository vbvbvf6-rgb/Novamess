const E2E_PREFIX = "e2e1:";
const IDENTITY_STORAGE_KEY = "nova-e2e-identity-v1";

interface StoredIdentity {
  privateKey: JsonWebKey;
  publicKey: JsonWebKey;
}

interface EncryptedMessageEnvelope {
  v: 1;
  alg: "ECDH-P256/AES-GCM";
  senderPublicKey: JsonWebKey;
  iv: string;
  data: string;
  wrappedKeys: {
    sender: { iv: string; data: string };
    recipient: { iv: string; data: string };
  };
}

let identityPromise: Promise<CryptoKeyPair> | null = null;
let published = false;

const toBase64 = (value: ArrayBuffer | ArrayBufferView) => {
  let binary = "";
  const bytes = ArrayBuffer.isView(value)
    ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
    : new Uint8Array(value);
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
};

const fromBase64 = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
};

const authHeaders = (): Record<string, string> => {
  const token = sessionStorage.getItem("pulse-token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function loadIdentity(): Promise<CryptoKeyPair> {
  const stored = localStorage.getItem(IDENTITY_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as StoredIdentity;
      const [privateKey, publicKey] = await Promise.all([
        crypto.subtle.importKey("jwk", parsed.privateKey, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]),
        crypto.subtle.importKey("jwk", parsed.publicKey, { name: "ECDH", namedCurve: "P-256" }, true, []),
      ]);
      return { privateKey, publicKey };
    } catch {
      localStorage.removeItem(IDENTITY_STORAGE_KEY);
    }
  }

  const pair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  ) as CryptoKeyPair;
  const [privateKey, publicKey] = await Promise.all([
    crypto.subtle.exportKey("jwk", pair.privateKey),
    crypto.subtle.exportKey("jwk", pair.publicKey),
  ]);
  localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify({ privateKey, publicKey }));
  return pair;
}

export async function ensureE2EIdentity(): Promise<void> {
  if (!identityPromise) identityPromise = loadIdentity();
  if (!published && sessionStorage.getItem("pulse-token")) {
    const identity = await identityPromise;
    const publicKey = await crypto.subtle.exportKey("jwk", identity.publicKey);
    const response = await fetch("/api/users/me/encryption-key", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ publicKey }),
    });
    if (!response.ok) throw new Error("Не удалось включить шифрование");
    published = true;
  }
}

async function deriveKey(privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> {
  const bits = await crypto.subtle.deriveBits({ name: "ECDH", public: publicKey }, privateKey, 256);
  const digest = await crypto.subtle.digest("SHA-256", bits);
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function wrapContentKey(key: CryptoKey, sharedKey: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const rawKey = await crypto.subtle.exportKey("raw", key);
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, sharedKey, rawKey);
  return { iv: toBase64(iv), data: toBase64(data) };
}

export function isEncryptedMessage(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(E2E_PREFIX);
}

export async function encryptForUser(plaintext: string, recipientId: number): Promise<string> {
  await ensureE2EIdentity();
  const identity = await identityPromise!;
  const response = await fetch(`/api/users/${recipientId}/encryption-key`, { headers: authHeaders() });
  if (!response.ok) throw new Error("Получатель ещё не включил защищённые сообщения");
  const { publicKey: recipientJwk } = await response.json() as { publicKey: JsonWebKey | null };
  if (!recipientJwk) throw new Error("Получатель ещё не включил защищённые сообщения");

  const recipientPublicKey = await crypto.subtle.importKey("jwk", recipientJwk, { name: "ECDH", namedCurve: "P-256" }, true, []);
  const contentKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, contentKey, new TextEncoder().encode(plaintext));
  const [recipientSharedKey, senderSharedKey] = await Promise.all([
    deriveKey(identity.privateKey, recipientPublicKey),
    deriveKey(identity.privateKey, identity.publicKey),
  ]);
  const envelope: EncryptedMessageEnvelope = {
    v: 1,
    alg: "ECDH-P256/AES-GCM",
    senderPublicKey: await crypto.subtle.exportKey("jwk", identity.publicKey),
    iv: toBase64(iv),
    data: toBase64(data),
    wrappedKeys: {
      sender: await wrapContentKey(contentKey, senderSharedKey),
      recipient: await wrapContentKey(contentKey, recipientSharedKey),
    },
  };
  return `${E2E_PREFIX}${btoa(JSON.stringify(envelope))}`;
}

export async function decryptMessage(value: string): Promise<string | null> {
  if (!isEncryptedMessage(value)) return null;
  try {
    await ensureE2EIdentity();
    const identity = await identityPromise!;
    const envelope = JSON.parse(atob(value.slice(E2E_PREFIX.length))) as EncryptedMessageEnvelope;
    const senderPublicKey = await crypto.subtle.importKey("jwk", envelope.senderPublicKey, { name: "ECDH", namedCurve: "P-256" }, true, []);
    const senderSharedKey = await deriveKey(identity.privateKey, senderPublicKey);
    const selfSharedKey = await deriveKey(identity.privateKey, identity.publicKey);
    let rawContentKey: ArrayBuffer | null = null;
    for (const [wrapped, shared] of [
      [envelope.wrappedKeys.recipient, senderSharedKey],
      [envelope.wrappedKeys.sender, selfSharedKey],
    ] as const) {
      try {
        rawContentKey = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(wrapped.iv) }, shared, fromBase64(wrapped.data));
        break;
      } catch {}
    }
    if (!rawContentKey) return null;
    const contentKey = await crypto.subtle.importKey("raw", rawContentKey, { name: "AES-GCM" }, false, ["decrypt"]);
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(envelope.iv) }, contentKey, fromBase64(envelope.data));
    return new TextDecoder().decode(plaintext);
  } catch {
    return null;
  }
}