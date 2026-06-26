import { useCallback, useEffect, useState } from 'react';
import type { MssgsEvent } from '../../../extension/src/shared/messages';

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

function eventThemeToUiTheme(kind: 'light' | 'dark' | 'highContrast' | 'highContrastLight'): Theme {
  return kind === 'light' || kind === 'highContrastLight' ? 'light' : 'dark';
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
      const data = event.data;
      if (typeof data !== 'object' || data === null) {
        return;
      }

      // Legacy direct themeChange message (kept for compatibility).
      if (
        'type' in data &&
        data.type === 'themeChange' &&
        'theme' in data &&
        (data.theme === 'light' || data.theme === 'dark')
      ) {
        applyTheme(data.theme);
        return;
      }

      // Current extension event format: { type: 'event', eventType: 'theme', payload: { kind } }
      const mssgsEvent = data as MssgsEvent | undefined;
      if (
        mssgsEvent?.type === 'event' &&
        mssgsEvent.eventType === 'theme' &&
        typeof mssgsEvent.payload === 'object' &&
        mssgsEvent.payload !== null &&
        'kind' in mssgsEvent.payload
      ) {
        const kind = mssgsEvent.payload.kind;
        if (
          kind === 'light' ||
          kind === 'dark' ||
          kind === 'highContrast' ||
          kind === 'highContrastLight'
        ) {
          applyTheme(eventThemeToUiTheme(kind));
        }
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
