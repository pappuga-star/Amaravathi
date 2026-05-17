import { useTranslation } from 'react-i18next';

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const isTelugu = i18n.language.startsWith('te');

  const toggleLanguage = () => {
    i18n.changeLanguage(isTelugu ? 'en' : 'te');
  };

  return (
    <button
      onClick={toggleLanguage}
      className="inline-flex items-center justify-center h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all duration-150"
      aria-label="Toggle language between English and Telugu"
    >
      <span
        className={
          !isTelugu
            ? 'font-bold text-emerald-700'
            : 'font-medium text-slate-500'
        }
      >
        English
      </span>
      <span className="text-slate-300 mx-1.5">|</span>
      <span
        className={
          isTelugu ? 'font-bold text-emerald-700' : 'font-medium text-slate-500'
        }
      >
        తెలుగు
      </span>
    </button>
  );
};
