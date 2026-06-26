import { useCallback, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const VSCodeThemeClass = {
  light: 'vscode-light',
  dark: 'vscode-dark',
} as const;

function resolveTheme(): Theme {
  if (typeof document === 'undefined') {
    return 'light';
  }

  const bodyClass = document.body.className;
  if (bodyClass.includes(VSCodeThemeClass.dark)) {
    return 'dark';
  }
  if (bodyClass.includes(VSCodeThemeClass.light)) {
    return 'light';
  }

  const dataTheme = document.documentElement.getAttribute('data-theme');
  if (dataTheme === 'dark' || dataTheme === 'light') {
    return dataTheme;
  }

  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}

export interface UseThemeReturn {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<Theme>(() => resolveTheme());

  const applyTheme = useCallback((next: Theme) => {
    document.documentElement.setAttribute('data-theme', next);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(next);
    setThemeState((current) => (current === next ? current : next));
  }, []);

  const setTheme = useCallback(
    (next: Theme) => {
      applyTheme(next);
    },
    [applyTheme],
  );

  const toggleTheme = useCallback(() => {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
  }, [applyTheme, theme]);

  useEffect(() => {
    applyTheme(resolveTheme());

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (): void => {
      applyTheme(resolveTheme());
    };

    mediaQuery.addEventListener('change', handleMediaChange);

    const observer = new MutationObserver(() => {
      applyTheme(resolveTheme());
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    const handleMessage = (event: MessageEvent<unknown>): void => {
      if (
        typeof event.data === 'object' &&
        event.data !== null &&
        'type' in event.data &&
        event.data.type === 'themeChange' &&
        'theme' in event.data &&
        (event.data.theme === 'light' || event.data.theme === 'dark')
      ) {
        applyTheme(event.data.theme);
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      observer.disconnect();
      window.removeEventListener('message', handleMessage);
    };
  }, [applyTheme]);

  return { theme, setTheme, toggleTheme };
}
