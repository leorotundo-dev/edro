'use client';

import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import EmotionCacheProvider from './EmotionCache';
import { baselightTheme, basedarkTheme } from './Theme';
import { ThemeContextProvider, useThemeMode } from '@/contexts/ThemeContext';

function InnerThemeProvider({ children }: { children: React.ReactNode }) {
  const { isDark } = useThemeMode();

  return (
    <MuiThemeProvider theme={isDark ? basedarkTheme : baselightTheme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <EmotionCacheProvider>
      <ThemeContextProvider>
        <InnerThemeProvider>
          {children}
        </InnerThemeProvider>
      </ThemeContextProvider>
    </EmotionCacheProvider>
  );
}
