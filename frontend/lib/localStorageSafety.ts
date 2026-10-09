const corruptStorageKeyPrefix = ".corrupt.";

function timestampForStorageKey(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

export function getCorruptLocalStorageKey(key: string, date = new Date()) {
  return `${key}${corruptStorageKeyPrefix}${timestampForStorageKey(date)}`;
}

export function quarantineLocalStorageValue(key: string) {
  if (typeof window === "undefined") return;

  const raw = window.localStorage.getItem(key);
  if (raw === null) return;

  window.localStorage.setItem(getCorruptLocalStorageKey(key), raw);
  window.localStorage.removeItem(key);
}
