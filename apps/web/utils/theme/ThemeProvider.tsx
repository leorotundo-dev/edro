'use client';

import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import EmotionCacheProvider from './EmotionCache';
import { baselightTheme } from './Theme';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <EmotionCacheProvider>
      <MuiThemeProvider theme={baselightTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </EmotionCacheProvider>
  );
}
