import { LitElement } from 'lit';
import { configureLocalization } from '@lit/localize';
import esTranslations from './es.json';
import enTranslations from './en.json';
import { WidgetEvents, WidgetEventTypes } from '../events';

// Do not modify this file by hand!
// Re-generate this file by running lit-localize.

/**
 * The locale code that templates in this source code are written in.
 */
export const sourceLocale = `es`;

/**
 * The other locale codes that this application is localized into. Sorted
 * lexicographically.
 */
export const targetLocales = [
  `en`,
] as const;

/**
 * All valid project locale codes. Sorted lexicographically.
 */
export const allLocales = [
  `en`,
  `es`,
] as const;

// Import JSON fallbacks for the custom .t() adapter
const translations: Record<string, any> = {
  es: esTranslations,
  en: enTranslations,
};

// Configure Lit Localize Runtime Mode
export const { getLocale: _getLitLocale, setLocale: setLitLocale } = configureLocalization({
  sourceLocale,
  targetLocales,
  // Use static imports instead of dynamic ones to avoid MIME/Server errors
  loadLocale: (locale: string) => Promise.resolve(translations[locale]),
});

// Get locale - checks localStorage first, defaults to 'es'
export function getLocale(): string {
  return localStorage.getItem('overlay-locale') || 'es';
}

// Initialize locale on load (called from main.ts)
export async function initLocale(): Promise<void> {
  const savedLocale = localStorage.getItem('overlay-locale');
  if (savedLocale) {
    await setLitLocale(savedLocale);
  }
}

export const setLocale = async (locale: any): Promise<void> => {
  // Save to localStorage for persistence
  localStorage.setItem('overlay-locale', locale);
  
  // 1) Trigger native Lit localize
  await setLitLocale(locale);
  
  // 2) Trigger legacy components that rely on the custom event
  window.dispatchEvent(new CustomEvent('locale-changed', { detail: { locale } }));
  
  // 3) Emit global widget event for cross-component communication
  WidgetEvents.emit(WidgetEventTypes.LOCALE_CHANGE, { locale });
};

export const getLocaleTranslations = (): Record<string, string> => {
  return translations[getLocale()] || translations.es;
};

export const getTranslations = (locale: string): Record<string, string> => {
  return translations[locale] || translations.es;
};

// Adapter for legacy .t() JSON mapping
export const t = (key: string, params?: Record<string, string | number>): string => {
  const currentLocale = getLocale();
  const localeTranslations = translations[currentLocale] || translations.es;
  let message = localeTranslations[key] || translations.es[key] || key;

  // Replace parameters
  if (params) {
    for (const [param, value] of Object.entries(params)) {
      message = message.replace(new RegExp(`\\{${param}\\}`, 'g'), String(value));
    }
  }

  return message;
};

// Reactive controller for Lit components
export class LocalizeController {
  private host: LitElement;
  private boundHandleChange: () => void;

  constructor(host: LitElement) {
    this.host = host;
    this.boundHandleChange = this.handleLocaleChange.bind(this);
    this.host.addController(this);
    
    // Listen for locale changes
    window.addEventListener('locale-changed', this.boundHandleChange);
  }

  hostDisconnected() {
    window.removeEventListener('locale-changed', this.boundHandleChange);
  }

  private handleLocaleChange() {
    this.host.requestUpdate();
  }

  t(key: string, params?: Record<string, string | number>): string {
    return t(key, params);
  }

  get locale(): string {
    return getLocale();
  }
}

// Re-export Lit Localize tools automatically for convenience
export * from '@lit/localize';
