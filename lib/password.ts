const encoder = new TextEncoder();
export const PASSWORD_ITERATIONS = 100000;
const hex = (data: ArrayBuffer) => Array.from(new Uint8Array(data), b => b.toString(16).padStart(2, '0')).join('');
export function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}
export async function passwordHash(password: string, salt: string, pepper: string, iterations = PASSWORD_ITERATIONS) {
  if (!pepper || iterations !== PASSWORD_ITERATIONS) throw new Error('Invalid password configuration');
  const pepperKey = await crypto.subtle.importKey('raw', encoder.encode(pepper), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  const material = await crypto.subtle.sign('HMAC', pepperKey, encoder.encode(password));
  const key = await crypto.subtle.importKey('raw', material, 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:encoder.encode(salt),iterations}, key, 256));
}
export async function tokenHash(token: string) {
  return hex(await crypto.subtle.digest('SHA-256', encoder.encode(token)));
}
export function randomToken() {
  return hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
}
