/**
 * Single storage abstraction so the rest of the app never cares about the
 * platform. On native (Android via Capacitor) it uses @capacitor/preferences;
 * on the web it falls back to localStorage. Both code paths are async so the
 * caller is identical everywhere.
 */
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const isNative = Capacitor.isNativePlatform();

export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    let raw: string | null;
    if (isNative) {
      raw = (await Preferences.get({ key })).value;
    } else {
      raw = localStorage.getItem(key);
    }
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function saveJSON<T>(key: string, value: T): Promise<void> {
  const raw = JSON.stringify(value);
  try {
    if (isNative) {
      await Preferences.set({ key, value: raw });
    } else {
      localStorage.setItem(key, raw);
    }
  } catch {
    // Best-effort persistence; a full or unavailable store must not crash the app.
  }
}
