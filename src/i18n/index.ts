import { useLangStore } from '../stores/langStore';
import { translations } from './translations';

export { translations };
export type { Language } from './translations';

export function useT() {
  const lang = useLangStore((s) => s.lang);
  return translations[lang];
}
