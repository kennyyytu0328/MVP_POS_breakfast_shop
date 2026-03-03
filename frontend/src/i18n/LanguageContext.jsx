import React, { createContext, useContext, useState, useCallback } from 'react';
import en from './locales/en.json';
import zhTW from './locales/zh-TW.json';

const locales = { en, 'zh-TW': zhTW };

const LanguageContext = createContext();

function getNestedValue(obj, key) {
  return key.split('.').reduce((acc, part) => acc?.[part], obj);
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(
    () => localStorage.getItem('pos-language') || 'zh-TW'
  );

  const setLanguage = useCallback((lang) => {
    setLanguageState(lang);
    localStorage.setItem('pos-language', lang);
  }, []);

  const t = useCallback((key) => {
    const value = getNestedValue(locales[language], key);
    if (value !== undefined) return value;
    const fallback = getNestedValue(locales['en'], key);
    if (fallback !== undefined) return fallback;
    return key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ t, language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
