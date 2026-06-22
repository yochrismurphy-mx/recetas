export const AUTH_COOKIE = "recetas_auth";

/** Pure passphrase comparison. Both must be non-empty and equal. */
export function checkPassphrase(
  input?: string | null,
  secret?: string | null,
): boolean {
  return Boolean(input && secret && input === secret);
}

/**
 * Derive the opaque cookie token from the passphrase, so the plaintext
 * passphrase is never stored in the cookie. Uses Web Crypto, which is
 * available in both the Node route handler and the proxy runtime.
 */
export async function tokenFor(secret: string): Promise<string> {
  const data = new TextEncoder().encode("recetas::" + secret);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
