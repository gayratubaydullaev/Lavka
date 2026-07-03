import messages from '@jomboy/i18n';

export type Lang = 'uz_cyrillic' | 'uz_latin' | 'ru' | 'en';

let currentLang: Lang = 'ru';

export function setLang(lang: Lang) {
  currentLang = lang;
  localStorage.setItem('jomboy_lang', lang);
}

export function getLang(): Lang {
  return (localStorage.getItem('jomboy_lang') as Lang) ?? currentLang;
}

export function t(key: string, params?: Record<string, string>): string {
  const entry = (messages as Record<string, Record<string, string>>)[key];
  let text = entry?.[getLang()] ?? entry?.ru ?? key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, v);
    });
  }
  return text;
}
