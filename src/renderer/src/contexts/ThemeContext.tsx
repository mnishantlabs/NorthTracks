import React, { createContext, useContext, useState, useEffect } from 'react';

export type Theme = 'dark' | 'light' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const cached = localStorage.getItem('northtracks-theme');
      if (cached && (cached === 'dark' || cached === 'light' || cached === 'system')) {
        return cached as Theme;
      }
    } catch (e) {}

    if (window.electronAPI?.getThemeSync) {
      try {
        const electronTheme = window.electronAPI.getThemeSync();
        if (electronTheme) return electronTheme as Theme;
      } catch (e) {
        console.error('Failed to load initial theme synchronously:', e);
      }
    }
    return 'dark';
  });

  const getResolvedTheme = (t: Theme): 'dark' | 'light' => {
    if (t === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return t;
  };

  const [_resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(() => {
    const init = getResolvedTheme(theme);
    document.documentElement.setAttribute('data-theme', init);
    return init;
  });

  useEffect(() => {
    const active = getResolvedTheme(theme);
    setResolvedTheme(active);
    document.documentElement.setAttribute('data-theme', active);

    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => {
        const sysTheme = media.matches ? 'dark' : 'light';
        setResolvedTheme(sysTheme);
        document.documentElement.setAttribute('data-theme', sysTheme);
      };
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
    return undefined;
  }, [theme]);

  const setTheme = async (nextTheme: Theme) => {
    setThemeState(nextTheme);
    const active = getResolvedTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', active);
    try {
      localStorage.setItem('northtracks-theme', nextTheme);
    } catch (e) {}
    if (window.electronAPI?.saveSettings) {
      try {
        await window.electronAPI.saveSettings({ theme: nextTheme });
      } catch (e) {
        console.error('Failed to persist theme:', e);
      }
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
