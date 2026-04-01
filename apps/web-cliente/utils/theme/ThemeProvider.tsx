'use client';

import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import EmotionCacheProvider from './EmotionCache';
import portalTheme from './Theme';

export default function PortalThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <EmotionCacheProvider>
      <MuiThemeProvider theme={portalTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </EmotionCacheProvider>
  );
}
