import { createTheme } from '@mui/material/styles';

const portalTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#E85219',
      light: '#fdeee8',
      dark: '#c43e10',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#a3a3a3',
      light: '#f5f5f5',
      dark: '#737373',
      contrastText: '#1a1a1a',
    },
    success: {
      main: '#13DEB9',
      light: '#E6FFFA',
      dark: '#02b3a9',
      contrastText: '#ffffff',
    },
    error: {
      main: '#FA896B',
      light: '#FDEDE8',
      dark: '#f3704d',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#FFAE1F',
      light: '#FEF5E5',
      dark: '#ae8e59',
      contrastText: '#ffffff',
    },
    text: {
      primary: '#1a1a1a',
      secondary: '#6b7280',
      disabled: '#9ca3af',
    },
    divider: '#e5e7eb',
    background: {
      default: '#f8f9fb',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: "'Space Grotesk', sans-serif",
    h1: { fontWeight: 600, fontSize: '2.25rem', lineHeight: 1.2, letterSpacing: '-0.006em' },
    h2: { fontWeight: 600, fontSize: '1.875rem', lineHeight: 1.2, letterSpacing: '-0.004em' },
    h3: { fontWeight: 600, fontSize: '1.5rem', lineHeight: 1.3, letterSpacing: '-0.002em' },
    h4: { fontWeight: 700, fontSize: '1.375rem', lineHeight: 1.3, letterSpacing: '-0.012em' },
    h5: { fontWeight: 700, fontSize: '1.125rem', lineHeight: 1.35, letterSpacing: '-0.006em' },
    h6: { fontWeight: 600, fontSize: '0.9375rem', lineHeight: 1.45, letterSpacing: '-0.003em' },
    subtitle1: { fontWeight: 500, fontSize: '1rem', lineHeight: 1.5 },
    subtitle2: { fontWeight: 500, fontSize: '0.875rem', lineHeight: 1.43 },
    body1: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.5 },
    body2: { fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.5 },
    caption: { fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.5 },
    button: { textTransform: 'none' as const, fontWeight: 600, fontSize: '0.875rem' },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, fontWeight: 600, fontSize: '0.75rem' },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' as const },
      styleOverrides: {
        root: { '& .MuiOutlinedInput-root': { borderRadius: 8 } },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#1a1a1a',
          boxShadow: 'none',
          borderBottom: '1px solid #e5e7eb',
        },
      },
    },
  },
});

export default portalTheme;
