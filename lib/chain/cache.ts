type Entry<T> = { value: T; expiresAt: number };
const cache = new Map<string, Entry<unknown>>();
export async function cached<T>(key: string, loader: () => Promise<T>, ttlMs = 60_000): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  const value = await loader();
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}
