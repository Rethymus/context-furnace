// CONTENT_SPEC §2：Locale 规则（zh-CN / en-US；检测链原规格 §65；切换保状态 §66；<html lang>/<title> 实时更新 §67 / D18）。
import { EN_US } from './en-US';
import { ZH_CN, type I18nKey } from './zh-CN';
import type { Locale } from '../game/types';

export type { I18nKey };

const STORAGE_KEY = 'cf.locale'; // §17.3 白名单

const TABLES: Record<Locale, Record<I18nKey, string>> = {
  'zh-CN': ZH_CN,
  'en-US': EN_US,
};

let current: Locale = 'zh-CN';
const listeners = new Set<(locale: Locale) => void>();

function getStoredLocale(): string | null {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

function getNavigatorLanguages(): readonly string[] {
  const nav = (globalThis as { navigator?: { languages?: readonly string[] } }).navigator;
  return nav?.languages ?? [];
}

// §65：localStorage → navigator.languages（zh/zh-CN/zh-Hans 开头 → zh-CN）→ 否则 en-US
export function detectLocale(): Locale {
  const stored = getStoredLocale();
  if (stored === 'zh-CN' || stored === 'en-US') return stored;
  for (const lang of getNavigatorLanguages()) {
    if (lang.startsWith('zh')) return 'zh-CN';
  }
  return 'en-US';
}

export function getLocale(): Locale {
  return current;
}

export function t(key: I18nKey, params?: Record<string, string | number>): string {
  let text = TABLES[current][key];
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

export function isLocale(value: string): value is Locale {
  return value === 'zh-CN' || value === 'en-US';
}

// §66：切换仅改文字；调用方保证不触碰 GameState（L4 断言）
export function setLocale(locale: Locale): void {
  if (locale === current) return;
  current = locale;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, locale);
  } catch {
    // 存储不可用时仅切换本次会话
  }
  applyDocumentAttributes();
  for (const fn of listeners) fn(locale);
}

export function onLocaleChange(fn: (locale: Locale) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// §67 / D18：<html lang> 与 <title> 实时更新
export function applyDocumentAttributes(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = current;
  document.title = t('doc.title');
}

export function initI18n(): Locale {
  current = detectLocale();
  applyDocumentAttributes();
  return current;
}

export function segmentTexts(card: { zh: string; en: string }[], locale: Locale): string[] {
  return card.map((s) => (locale === 'zh-CN' ? s.zh : s.en));
}
