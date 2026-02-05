import { createTheme } from '@mui/material/styles';
import DefaultColors from './DefaultColors';
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
    borderRadius: 12,
  },
});

export { baselightTheme };
