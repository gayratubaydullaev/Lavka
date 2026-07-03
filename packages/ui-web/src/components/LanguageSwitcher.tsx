import { t, setLang, getLang, type Lang } from '../i18n';

const langs: { id: Lang; label: string }[] = [
  { id: 'ru', label: 'RU' },
  { id: 'uz_latin', label: 'UZ' },
  { id: 'uz_cyrillic', label: 'ЎЗ' },
  { id: 'en', label: 'EN' },
];

export function LanguageSwitcher() {
  return (
    <select
      value={getLang()}
      onChange={(e) => setLang(e.target.value as Lang)}
      aria-label="Language"
    >
      {langs.map((l) => (
        <option key={l.id} value={l.id}>
          {l.label}
        </option>
      ))}
    </select>
  );
}

export { t };
