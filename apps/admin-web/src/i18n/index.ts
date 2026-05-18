import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import commonEn from '../locales/en/common.json';
import commonTe from '../locales/te/common.json';

const STORAGE_KEY = 'app_language';
const defaultLang = localStorage.getItem(STORAGE_KEY) || 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: commonEn,
    },
    te: {
      common: commonTe,
    },
  },
  lng: defaultLang,
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common'],
  interpolation: {
    escapeValue: false, // react already safes from xss
  },
});

// Listen to language changes to persist state
i18n.on('languageChanged', (lng) => {
  localStorage.setItem(STORAGE_KEY, lng);
});
