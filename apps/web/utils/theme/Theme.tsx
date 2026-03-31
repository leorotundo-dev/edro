import { createTheme } from '@mui/material/styles';
import DefaultColors from './DefaultColors';
import DarkColors from './DarkColors';
import TypographyConfig from './Typography';
import ComponentOverrides from './Components';
import shadows from './Shadows';

const baselightTheme = createTheme({
  palette: {
    mode: 'light',
    ...DefaultColors,
  },
  typography: TypographyConfig,
  shadows,
  components: ComponentOverrides,
  shape: {
    borderRadius: 4,
  },
});

const basedarkTheme = createTheme({
  palette: {
    mode: 'dark',
    ...DarkColors,
  },
  typography: TypographyConfig,
  shadows,
  components: ComponentOverrides,
  shape: {
    borderRadius: 4,
  },
});

export { baselightTheme, basedarkTheme };
