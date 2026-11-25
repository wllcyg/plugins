import type { CleanRedirectSettings, RedirectStats } from '../types';

export const DEFAULT_SETTINGS: CleanRedirectSettings = {
  autoRedirectEnabled: true,
  preCleanLinksEnabled: true,
  cleanTrackingEnabled: true,
  stripCopyCopyrightEnabled: true,
  heuristicRedirectEnabled: true
};

export const DEFAULT_STATS: RedirectStats = {
  bypassedCount: 0,
  cleanedParamsCount: 0
};

const SETTINGS_KEY = 'clean_redirect_settings';
const STATS_KEY = 'clean_redirect_stats';

export async function getSettings(): Promise<CleanRedirectSettings> {
  try {
    const data = await chrome.storage.local.get(SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...data[SETTINGS_KEY] };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Partial<CleanRedirectSettings>): Promise<CleanRedirectSettings> {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  await chrome.storage.local.set({ [SETTINGS_KEY]: updated });
  return updated;
}

export async function getStats(): Promise<RedirectStats> {
  try {
    const data = await chrome.storage.local.get(STATS_KEY);
    return { ...DEFAULT_STATS, ...data[STATS_KEY] };
  } catch {
    return DEFAULT_STATS;
  }
}

export async function recordRedirect(): Promise<void> {
  try {
    const stats = await getStats();
    stats.bypassedCount++;
    stats.lastRedirectTime = Date.now();
    await chrome.storage.local.set({ [STATS_KEY]: stats });
  } catch {
    // ignore
  }
}

export async function recordCleanedParams(count: number): Promise<void> {
  if (count <= 0) return;
  try {
    const stats = await getStats();
    stats.cleanedParamsCount += count;
    await chrome.storage.local.set({ [STATS_KEY]: stats });
  } catch {
    // ignore
  }
}
