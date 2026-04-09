import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useEffect, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';

import { ar } from './ar';
import { fr } from './fr';

export type Language = 'ar' | 'fr';
type Dict = typeof ar;

type LanguageContextValue = {
  language: Language;
  t: Dict;
  isRTL: boolean;
  setLanguage: (next: Language) => Promise<void>;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ar');

  useEffect(() => {
    let isMounted = true;

    const loadLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem('language');
        if (isMounted && (saved === 'ar' || saved === 'fr')) {
          setLanguageState(saved);
        }
      } catch {
        // Keep default language when persisted storage is unavailable.
      }
    };

    void loadLanguage();

    return () => {
      isMounted = false;
    };
  }, []);

  const setLanguage = async (next: Language) => {
    setLanguageState(next);
    I18nManager.allowRTL(next === 'ar');

    try {
      await AsyncStorage.setItem('language', next);
    } catch {
      // Ignore persistence failures to keep in-memory language updates working.
    }
  };

  const value = useMemo(
    () => ({
      language,
      t: language === 'ar' ? ar : fr,
      isRTL: language === 'ar',
      setLanguage,
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = React.use(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be inside LanguageProvider');
  }
  return ctx;
}
