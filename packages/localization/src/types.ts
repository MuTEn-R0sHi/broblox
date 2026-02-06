/**
 * @rbx/localization — Type Definitions
 *
 * Types for locales, string tables, interpolation, and pluralization.
 */

// ============================================================================
// Locale
// ============================================================================

/** Supported locale codes (BCP 47 subset) */
export type LocaleCode =
  | "en"
  | "es"
  | "fr"
  | "de"
  | "pt"
  | "ja"
  | "ko"
  | "zh-cn"
  | "zh-tw"
  | "ru"
  | "ar"
  | "it"
  | "nl"
  | "pl"
  | "tr"
  | "th"
  | "vi"
  | "id";

/** Locale metadata */
export interface LocaleInfo {
  code: LocaleCode;
  /** Display name in the locale's own language */
  nativeName: string;
  /** Display name in English */
  englishName: string;
  /** Text direction */
  direction: "ltr" | "rtl";
}

// ============================================================================
// String Tables
// ============================================================================

/** A flat key-value string table for a single locale */
export type StringTable = Map<string, string>;

/** Namespace to string table mapping */
export type NamespacedStrings = Map<string, StringTable>;

/** Pluralization categories (CLDR subset) */
export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

/** A plural-aware translation value */
export interface PluralEntry {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

/** Interpolation parameters */
export type InterpolationParams = Record<string, string | number>;

// ============================================================================
// Configuration
// ============================================================================

export interface LocalizationConfig {
  /** Default fallback locale */
  defaultLocale: LocaleCode;
  /** Whether to log missing keys */
  logMissing: boolean;
  /** Placeholder format for missing keys: "key" | "empty" | "bracket" */
  missingKeyBehavior: "key" | "empty" | "bracket";
  /** Interpolation delimiters */
  interpolationStart: string;
  interpolationEnd: string;
  /** Whether to enable namespace support */
  enableNamespaces: boolean;
}

export const DEFAULT_LOCALIZATION_CONFIG: LocalizationConfig = {
  defaultLocale: "en",
  logMissing: true,
  missingKeyBehavior: "bracket",
  interpolationStart: "{{",
  interpolationEnd: "}}",
  enableNamespaces: true,
};

// ============================================================================
// Results
// ============================================================================

export type TranslationStatus =
  | "success"
  | "missing_key"
  | "missing_locale"
  | "invalid_namespace"
  | "interpolation_error";

export interface TranslationResult {
  ok: boolean;
  status: TranslationStatus;
  text?: string;
  fallback?: boolean;
}

// ============================================================================
// Callbacks
// ============================================================================

export interface LocaleChangedEvent {
  previousLocale: LocaleCode;
  newLocale: LocaleCode;
  timestamp: number;
}

export type LocaleChangedCallback = (event: LocaleChangedEvent) => void;
export type MissingKeyCallback = (locale: LocaleCode, key: string, namespace?: string) => void;

// ============================================================================
// Locale Data
// ============================================================================

export const LOCALE_INFO: ReadonlyArray<LocaleInfo> = [
  { code: "en", nativeName: "English", englishName: "English", direction: "ltr" },
  { code: "es", nativeName: "Español", englishName: "Spanish", direction: "ltr" },
  { code: "fr", nativeName: "Français", englishName: "French", direction: "ltr" },
  { code: "de", nativeName: "Deutsch", englishName: "German", direction: "ltr" },
  { code: "pt", nativeName: "Português", englishName: "Portuguese", direction: "ltr" },
  { code: "ja", nativeName: "日本語", englishName: "Japanese", direction: "ltr" },
  { code: "ko", nativeName: "한국어", englishName: "Korean", direction: "ltr" },
  { code: "zh-cn", nativeName: "简体中文", englishName: "Chinese (Simplified)", direction: "ltr" },
  { code: "zh-tw", nativeName: "繁體中文", englishName: "Chinese (Traditional)", direction: "ltr" },
  { code: "ru", nativeName: "Русский", englishName: "Russian", direction: "ltr" },
  { code: "ar", nativeName: "العربية", englishName: "Arabic", direction: "rtl" },
  { code: "it", nativeName: "Italiano", englishName: "Italian", direction: "ltr" },
  { code: "nl", nativeName: "Nederlands", englishName: "Dutch", direction: "ltr" },
  { code: "pl", nativeName: "Polski", englishName: "Polish", direction: "ltr" },
  { code: "tr", nativeName: "Türkçe", englishName: "Turkish", direction: "ltr" },
  { code: "th", nativeName: "ไทย", englishName: "Thai", direction: "ltr" },
  { code: "vi", nativeName: "Tiếng Việt", englishName: "Vietnamese", direction: "ltr" },
  { code: "id", nativeName: "Bahasa Indonesia", englishName: "Indonesian", direction: "ltr" },
];
