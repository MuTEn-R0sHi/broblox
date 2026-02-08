/**
 * @rbx/localization — String Registry
 *
 * Manages string tables per locale with namespace support.
 */

import { createLogger } from "@rbx/core";
import type {
  LocaleCode,
  InterpolationParams,
  LocalizationConfig,
  TranslationResult,
  LocaleChangedEvent,
  LocaleChangedCallback,
  MissingKeyCallback,
} from "./types";
import { DEFAULT_LOCALIZATION_CONFIG } from "./types";

const PLURAL_SEPARATOR = "|";

export class LocalizationService {
  private currentLocale: LocaleCode;
  private config: LocalizationConfig;

  // locale -> namespace -> key -> value
  private strings = new Map<string, Map<string, Map<string, string>>>();

  private localeChangedCallbacks: LocaleChangedCallback[] = [];
  private missingKeyCallbacks: MissingKeyCallback[] = [];

  private logger;

  constructor(config?: Partial<LocalizationConfig>) {
    this.config = { ...DEFAULT_LOCALIZATION_CONFIG, ...config };
    this.currentLocale = this.config.defaultLocale;
    this.logger = this.config.logMissing ? createLogger("Localization") : undefined;
  }

  // --------------------------------------------------------------------------
  // Registration
  // --------------------------------------------------------------------------

  /**
   * Register a flat key-value table for a locale.
   * Keys can be namespaced with a dot: "ui.play_button", "ui.settings"
   */
  registerStrings(locale: LocaleCode, entries: Record<string, string>, namespace?: string): void {
    const ns = namespace ?? "default";
    const localeKey = locale as string;

    if (!this.strings.has(localeKey)) {
      this.strings.set(localeKey, new Map<string, Map<string, string>>());
    }
    const localeMap = this.strings.get(localeKey)!;

    if (!localeMap.has(ns)) {
      localeMap.set(ns, new Map<string, string>());
    }
    const nsMap = localeMap.get(ns)!;

    // Use manual key iteration (roblox-ts compatible)
    const keys = this.objectKeys(entries);
    for (let i = 0; i < keys.size(); i++) {
      const k = keys[i];
      nsMap.set(k, entries[k]);
    }
  }

  /** Register strings for multiple locales at once */
  registerBulk(
    data: Array<{ locale: LocaleCode; entries: Record<string, string>; namespace?: string }>
  ): void {
    for (let i = 0; i < data.size(); i++) {
      this.registerStrings(data[i].locale, data[i].entries, data[i].namespace);
    }
  }

  /** Remove all strings for a locale */
  clearLocale(locale: LocaleCode): void {
    this.strings.delete(locale as string);
  }

  /** Remove all strings */
  clearAll(): void {
    this.strings.clear();
  }

  /** Get number of registered locales */
  localeCount(): number {
    let count = 0;
    this.strings.forEach(() => count++);
    return count;
  }

  /** Check if a locale has any string registrations */
  hasLocale(locale: LocaleCode): boolean {
    return this.strings.has(locale as string);
  }

  /** Get all registered locale codes */
  getRegisteredLocales(): LocaleCode[] {
    const result: LocaleCode[] = [];
    this.strings.forEach((_, k) => result.push(k as LocaleCode));
    return result;
  }

  // --------------------------------------------------------------------------
  // Translation
  // --------------------------------------------------------------------------

  /** Translate a key with optional interpolation */
  t(key: string, params?: InterpolationParams, namespace?: string): string {
    const result = this.translate(this.currentLocale, key, params, namespace);
    if (result.ok && result.text !== undefined) return result.text;
    return this.formatMissingKey(key);
  }

  /** Translate with explicit locale */
  tLocale(
    locale: LocaleCode,
    key: string,
    params?: InterpolationParams,
    namespace?: string
  ): string {
    const result = this.translate(locale, key, params, namespace);
    if (result.ok && result.text !== undefined) return result.text;
    return this.formatMissingKey(key);
  }

  /** Full translation result with status */
  translate(
    locale: LocaleCode,
    key: string,
    params?: InterpolationParams,
    namespace?: string
  ): TranslationResult {
    const ns = namespace ?? "default";
    const localeKey = locale as string;

    // Try requested locale
    let text = this.lookupKey(localeKey, ns, key);

    // Fallback to default locale
    if (text === undefined && locale !== this.config.defaultLocale) {
      text = this.lookupKey(this.config.defaultLocale as string, ns, key);
      if (text !== undefined) {
        return {
          ok: true,
          status: "success",
          text: this.interpolate(text, params),
          fallback: true,
        };
      }
    }

    if (text === undefined) {
      this.onMissingKey(locale, key, ns);
      return { ok: false, status: "missing_key" };
    }

    return {
      ok: true,
      status: "success",
      text: this.interpolate(text, params),
      fallback: false,
    };
  }

  /**
   * Pluralize — select the right form based on count.
   *
   * The value in the string table should use pipe-separated forms:
   *   "one item|{{count}} items"          → one | other
   *   "no items|one item|{{count}} items"  → zero | one | other
   */
  plural(key: string, count: number, params?: InterpolationParams, namespace?: string): string {
    const raw = this.lookupKey(this.currentLocale as string, namespace ?? "default", key);
    if (raw === undefined) {
      const fbRaw = this.lookupKey(
        this.config.defaultLocale as string,
        namespace ?? "default",
        key
      );
      if (fbRaw === undefined) {
        this.onMissingKey(this.currentLocale, key, namespace);
        return this.formatMissingKey(key);
      }
      return this.selectPlural(fbRaw, count, params);
    }
    return this.selectPlural(raw, count, params);
  }

  // --------------------------------------------------------------------------
  // Locale management
  // --------------------------------------------------------------------------

  /** Get current locale */
  getLocale(): LocaleCode {
    return this.currentLocale;
  }

  /** Set current locale */
  setLocale(locale: LocaleCode): void {
    if (locale === this.currentLocale) return;
    const prev = this.currentLocale;
    this.currentLocale = locale;

    const evt: LocaleChangedEvent = {
      previousLocale: prev,
      newLocale: locale,
      timestamp: os.time(),
    };
    for (let i = 0; i < this.localeChangedCallbacks.size(); i++) {
      this.localeChangedCallbacks[i](evt);
    }
  }

  // --------------------------------------------------------------------------
  // Events
  // --------------------------------------------------------------------------

  onLocaleChanged(cb: LocaleChangedCallback): void {
    this.localeChangedCallbacks.push(cb);
  }

  onMissingKeyEvent(cb: MissingKeyCallback): void {
    this.missingKeyCallbacks.push(cb);
  }

  // --------------------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------------------

  private lookupKey(localeKey: string, ns: string, key: string): string | undefined {
    const localeMap = this.strings.get(localeKey);
    if (!localeMap) return undefined;
    const nsMap = localeMap.get(ns);
    if (!nsMap) return undefined;
    return nsMap.get(key);
  }

  private interpolate(text: string, params?: InterpolationParams): string {
    if (params === undefined) return text;

    let result = text;
    const keys = this.objectKeys(params);
    for (let i = 0; i < keys.size(); i++) {
      const k = keys[i];
      const placeholder = `${this.config.interpolationStart}${k}${this.config.interpolationEnd}`;
      const val = `${params[k]}`;
      // Simple string replacement (roblox-ts compatible)
      while (result.find(placeholder)[0] !== undefined) {
        const [start] = result.find(placeholder);
        if (start === undefined) break;
        result = result.sub(1, start - 1) + val + result.sub(start + placeholder.size());
      }
    }
    return result;
  }

  private selectPlural(raw: string, count: number, params?: InterpolationParams): string {
    // Split on pipe
    const parts: string[] = [];
    let current = raw;
    let pipeIdx = current.find(PLURAL_SEPARATOR)[0];
    while (pipeIdx !== undefined) {
      parts.push(current.sub(1, pipeIdx - 1));
      current = current.sub(pipeIdx + 1);
      pipeIdx = current.find(PLURAL_SEPARATOR)[0];
    }
    parts.push(current);

    // Merge count into params
    const merged: InterpolationParams = { count, ...(params ?? {}) };

    if (parts.size() === 1) {
      return this.interpolate(parts[0], merged);
    }
    if (parts.size() === 2) {
      // one | other
      const form = count === 1 ? parts[0] : parts[1];
      return this.interpolate(form, merged);
    }
    // zero | one | other
    if (count === 0) return this.interpolate(parts[0], merged);
    if (count === 1) return this.interpolate(parts[1], merged);
    return this.interpolate(parts[parts.size() - 1], merged);
  }

  private formatMissingKey(key: string): string {
    if (this.config.missingKeyBehavior === "empty") return "";
    if (this.config.missingKeyBehavior === "key") return key;
    return `[${key}]`;
  }

  private onMissingKey(locale: LocaleCode, key: string, namespace?: string): void {
    this.logger?.warn(
      `Missing key: ${key} (locale=${locale as string}, ns=${namespace ?? "default"})`
    );
    for (let i = 0; i < this.missingKeyCallbacks.size(); i++) {
      this.missingKeyCallbacks[i](locale, key, namespace);
    }
  }

  /** roblox-ts compatible Object.keys alternative */
  private objectKeys<T extends Record<string, unknown>>(obj: T): string[] {
    const keys: string[] = [];
    for (const [k] of pairs(obj as unknown as Record<string, unknown>)) {
      keys.push(k as string);
    }
    return keys;
  }
}
