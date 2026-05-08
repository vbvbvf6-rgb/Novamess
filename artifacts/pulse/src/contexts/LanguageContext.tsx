import React, { createContext, useContext, useState, useEffect } from "react";
import translations, { Lang, TranslationKey } from "@/i18n/translations";

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem("pulse-language");
    return (stored === "en" || stored === "ru") ? stored : "ru";
  });

  const setLang = (newLang: Lang) => {
    localStorage.setItem("pulse-language", newLang);
    setLangState(newLang);
    window.dispatchEvent(new CustomEvent("pulse-language-changed", { detail: newLang }));
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const newLang = (e as CustomEvent<Lang>).detail;
      if (newLang === "ru" || newLang === "en") setLangState(newLang);
    };
    window.addEventListener("pulse-language-changed", handler);
    return () => window.removeEventListener("pulse-language-changed", handler);
  }, []);

  const t = (key: TranslationKey): string => {
    return (translations[lang] as Record<string, string>)[key]
      ?? (translations["ru"] as Record<string, string>)[key]
      ?? key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
