import { create } from 'zustand';
import { createAsyncStorage } from '@react-native-async-storage/async-storage';
import type { Language } from '../i18n/translations';

const LANG_KEY = 'lang';
// v3 API: namespaced storage instance
const storage = createAsyncStorage('storeflow');

type LangState = {
  lang: Language;
  isUrdu: boolean;
  setLang: (lang: Language) => void;
  loadLang: () => Promise<void>;
};

export const useLangStore = create<LangState>((set) => ({
  lang: 'en',
  isUrdu: false,

  setLang: async (lang: Language) => {
    set({ lang, isUrdu: lang === 'ur' });
    try { await storage.setItem(LANG_KEY, lang); } catch {}
  },

  loadLang: async () => {
    try {
      const saved = await storage.getItem(LANG_KEY);
      if (saved === 'en' || saved === 'ur') {
        set({ lang: saved, isUrdu: saved === 'ur' });
      }
    } catch {}
  },
}));
