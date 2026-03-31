import { forwardRef } from 'react';
import Slide from '@mui/material/Slide';
import type { Components, Theme } from '@mui/material/styles';
import type { TransitionProps } from '@mui/material/transitions';
import type { ReactElement } from 'react';
import '@mui/lab/themeAugmentation';

/* Global dialog transition — all MuiDialog instances slide up by default */
const SlideUp = forwardRef<unknown, TransitionProps & { children: ReactElement }>(
  function SlideUp(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
  },
);

const Components: Components<Theme> = {
  MuiTypography: {
    styleOverrides: {
      h4: ({ theme }) => ({ color: theme.palette.primary.main }),
      h5: ({ theme }) => ({ color: theme.palette.primary.main }),
      h6: ({ theme }) => ({ color: theme.palette.primary.main }),
    },
  },
  MuiCssBaseline: {
    styleOverrides: {
      '*': { boxSizing: 'border-box' },
      html: { scrollBehavior: 'smooth' },
      a: { textDecoration: 'none' },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: Number(theme.shape.borderRadius) * 2,
        border: 'none',
        boxShadow: theme.palette.mode === 'dark'
          ? '0 2px 12px rgba(0,0,0,0.3)'
          : '0 2px 12px rgba(0,0,0,0.07)',
        transition: 'box-shadow 0.2s ease',
        '&:hover': {
          boxShadow: theme.palette.mode === 'dark'
            ? '0 6px 24px rgba(0,0,0,0.4)'
            : '0 6px 24px rgba(0,0,0,0.11)',
        },
      }),
    },
  },
  MuiCardHeader: {
    styleOverrides: {
      root: { padding: '24px 24px 0' },
      title: { fontSize: '1.125rem', fontWeight: 600 },
      subheader: ({ theme }) => ({
        fontSize: '0.75rem',
        color: theme.palette.text.secondary,
      }),
    },
  },
  MuiCardContent: {
    styleOverrides: {
      root: {
        padding: '24px',
        '&:last-child': { paddingBottom: '24px' },
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: theme.shape.borderRadius,
        textTransform: 'none',
        fontWeight: 600,
        padding: '8px 20px',
        boxShadow: 'none',
        '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
      }),
      sizeSmall: ({ theme }) => ({
        padding: '4px 12px',
        fontSize: '0.75rem',
        borderRadius: theme.shape.borderRadius,
      }),
      sizeLarge: ({ theme }) => ({
        padding: '12px 28px',
        fontSize: '1rem',
        borderRadius: theme.shape.borderRadius,
      }),
      containedPrimary: ({ theme }) => ({
        '&:hover': { backgroundColor: theme.palette.primary.dark },
      }),
    },
  },
  MuiLoadingButton: {
    defaultProps: { loadingPosition: 'start' },
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: theme.shape.borderRadius,
        textTransform: 'none',
        fontWeight: 600,
        padding: '8px 20px',
        boxShadow: 'none',
        '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
        '&.MuiLoadingButton-loading': { opacity: 0.75 },
      }),
      loadingIndicator: { color: 'inherit' },
      sizeSmall: ({ theme }) => ({
        padding: '4px 12px',
        fontSize: '0.75rem',
        borderRadius: theme.shape.borderRadius,
      }),
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: theme.shape.borderRadius,
        transition: 'all 0.2s ease',
      }),
    },
  },
  MuiChip: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: theme.shape.borderRadius,
        fontWeight: 600,
        fontSize: '0.75rem',
      }),
      sizeSmall: { height: '24px', fontSize: '0.6875rem' },
      colorPrimary: ({ theme }) => ({
        backgroundColor: theme.palette.primary.light,
        color: theme.palette.mode === 'dark' ? theme.palette.primary.dark : theme.palette.primary.main,
      }),
      colorSuccess: ({ theme }) => ({
        backgroundColor: theme.palette.success.light,
        color: theme.palette.mode === 'dark' ? theme.palette.success.dark : theme.palette.success.main,
      }),
      colorWarning: ({ theme }) => ({
        backgroundColor: theme.palette.warning.light,
        color: theme.palette.mode === 'dark' ? theme.palette.warning.dark : theme.palette.warning.main,
      }),
      colorError: ({ theme }) => ({
        backgroundColor: theme.palette.error.light,
        color: theme.palette.mode === 'dark' ? theme.palette.error.dark : theme.palette.error.main,
      }),
      colorInfo: ({ theme }) => ({
        backgroundColor: theme.palette.info.light,
        color: theme.palette.mode === 'dark' ? theme.palette.info.dark : theme.palette.info.main,
      }),
    },
  },
  MuiTextField: {
    defaultProps: { variant: 'outlined', size: 'small' },
    styleOverrides: {
      root: ({ theme }) => ({
        '& .MuiOutlinedInput-root': {
          borderRadius: theme.shape.borderRadius,
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
            borderWidth: '2px',
          },
        },
      }),
    },
  },
  MuiSelect: {
    defaultProps: { size: 'small' },
    styleOverrides: {
      root: ({ theme }) => ({ borderRadius: theme.shape.borderRadius }),
    },
  },
  MuiAutocomplete: {
    defaultProps: { size: 'small' },
    styleOverrides: {
      paper: ({ theme }) => ({
        borderRadius: theme.shape.borderRadius,
        marginTop: '4px',
      }),
      option: ({ theme }) => ({
        borderRadius: theme.shape.borderRadius,
        fontSize: '0.875rem',
        '&[aria-selected="true"]': {
          backgroundColor: `${theme.palette.primary.main}14`,
          color: theme.palette.primary.main,
        },
        '&[aria-selected="true"].Mui-focused': {
          backgroundColor: `${theme.palette.primary.main}24`,
        },
      }),
      listbox: { padding: '4px' },
    },
  },
  MuiToggleButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: theme.shape.borderRadius,
        textTransform: 'none',
        fontWeight: 600,
        fontSize: '0.8125rem',
        padding: '5px 14px',
        border: `1px solid ${theme.palette.divider}`,
        color: theme.palette.text.secondary,
        transition: 'all 0.15s ease',
        '&:hover': {
          backgroundColor: theme.palette.action.hover,
          borderColor: theme.palette.divider,
        },
        '&.Mui-selected': {
          backgroundColor: `${theme.palette.primary.main}12`,
          color: theme.palette.primary.main,
          borderColor: `${theme.palette.primary.main}44`,
          '&:hover': { backgroundColor: `${theme.palette.primary.main}1e` },
        },
        '&.MuiToggleButton-sizeSmall': {
          padding: '3px 10px',
          fontSize: '0.75rem',
        },
      }),
    },
  },
  MuiToggleButtonGroup: {
    styleOverrides: {
      root: ({ theme }) => ({
        gap: '4px',
        '& .MuiToggleButtonGroup-grouped': {
          borderRadius: `${theme.shape.borderRadius}px !important`,
          border: 'inherit !important',
          marginLeft: '0 !important',
        },
      }),
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundColor: theme.palette.mode === 'dark'
          ? 'rgba(28,28,28,0.88)'
          : 'rgba(255,255,255,0.88)',
        color: theme.palette.text.primary,
        boxShadow: `0 1px 0 0 ${theme.palette.divider}`,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }),
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: theme.shape.borderRadius,
        gap: '12px',
        marginBottom: '2px',
        padding: '8px 12px',
        transition: 'all 0.2s ease',
        '&:hover': { backgroundColor: theme.palette.action.hover },
        '&.Mui-selected': {
          backgroundColor: `${theme.palette.primary.main}14`,
          color: theme.palette.primary.main,
          '&:hover': { backgroundColor: `${theme.palette.primary.main}24` },
          '& .MuiListItemIcon-root': { color: theme.palette.primary.main },
        },
      }),
    },
  },
  MuiListItemIcon: {
    styleOverrides: {
      root: ({ theme }) => ({
        minWidth: '36px',
        color: theme.palette.text.secondary,
      }),
    },
  },
  MuiLinearProgress: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: theme.shape.borderRadius,
        height: '6px',
        backgroundColor: theme.palette.mode === 'dark'
          ? 'rgba(255,255,255,0.12)'
          : theme.palette.grey[200],
      }),
    },
  },
  MuiAvatar: {
    styleOverrides: {
      root: { fontSize: '0.875rem', fontWeight: 600 },
    },
  },
  MuiTableHead: {
    styleOverrides: {
      root: ({ theme }) => ({
        '& .MuiTableCell-root': {
          fontWeight: 600,
          fontSize: '0.75rem',
          color: theme.palette.text.secondary,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          borderBottom: `2px solid ${theme.palette.divider}`,
        },
      }),
    },
  },
  MuiTableRow: {
    styleOverrides: {
      root: ({ theme }) => ({
        transition: 'background-color 0.15s ease',
        '&:hover': { backgroundColor: theme.palette.action.hover },
        '&:last-child .MuiTableCell-root': { borderBottom: 'none' },
      }),
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: ({ theme }) => ({
        padding: '12px 16px',
        borderBottom: `1px solid ${theme.palette.divider}`,
        fontSize: '0.875rem',
      }),
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: ({ theme }) => ({
        backgroundImage: 'none',
        ...(theme.palette.mode === 'dark' && {
          backgroundColor: theme.palette.background.paper,
        }),
      }),
      rounded: ({ theme }) => ({
        borderRadius: Number(theme.shape.borderRadius) * 2,
      }),
    },
  },
  MuiMenu: {
    styleOverrides: {
      paper: ({ theme }) => ({
        borderRadius: theme.shape.borderRadius,
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: theme.palette.mode === 'dark'
          ? '0 8px 32px rgba(0,0,0,0.5)'
          : '0 8px 32px rgba(0,0,0,0.12)',
        padding: '4px',
      }),
      list: { padding: '4px 0' },
    },
  },
  MuiMenuItem: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: theme.shape.borderRadius,
        fontSize: '0.875rem',
        padding: '8px 12px',
        transition: 'background-color 0.15s ease',
        '&:hover': { backgroundColor: theme.palette.action.hover },
        '&.Mui-selected': {
          backgroundColor: `${theme.palette.primary.main}12`,
          '&:hover': { backgroundColor: `${theme.palette.primary.main}20` },
        },
      }),
    },
  },
  MuiDialog: {
    defaultProps: {
      TransitionComponent: SlideUp,
      transitionDuration: { enter: 220, exit: 160 },
    },
    styleOverrides: {
      paper: ({ theme }) => ({
        borderRadius: Number(theme.shape.borderRadius) * 2,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.12)',
      }),
    },
  },
  MuiDialogTitle: {
    styleOverrides: {
      root: { fontSize: '1rem', fontWeight: 700, padding: '20px 24px 12px' },
    },
  },
  MuiDialogContent: {
    styleOverrides: {
      root: { padding: '8px 24px 16px' },
    },
  },
  MuiDialogActions: {
    styleOverrides: {
      root: { padding: '12px 24px 20px', gap: '8px' },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: ({ theme }) => ({
        textTransform: 'none',
        fontWeight: 600,
        fontSize: '0.875rem',
        minHeight: 42,
        borderRadius: theme.shape.borderRadius,
        marginRight: theme.spacing(0.5),
        '&.Mui-selected': {
          color: theme.palette.primary.main,
          backgroundColor: `${theme.palette.primary.main}10`,
        },
      }),
    },
  },
  MuiTabs: {
    styleOverrides: {
      root: { minHeight: 42 },
      indicator: ({ theme }) => ({
        height: 3,
        borderRadius: 999,
        backgroundColor: theme.palette.primary.main,
      }),
      scroller: { overflow: 'visible !important' },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: ({ theme }) => ({
        borderRadius: 0,
        borderLeft: `1px solid ${theme.palette.divider}`,
        backgroundImage: 'none',
      }),
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: theme.shape.borderRadius,
        border: `1px solid ${theme.palette.divider}`,
      }),
    },
  },
  MuiStepper: {
    styleOverrides: { root: { padding: 0 } },
  },
  MuiStepConnector: {
    styleOverrides: {
      line: ({ theme }) => ({
        borderColor: `${theme.palette.primary.main}33`,
        borderTopWidth: 2,
        borderRadius: 999,
      }),
    },
  },
  MuiTooltip: {
    defaultProps: { arrow: true },
    styleOverrides: {
      tooltip: ({ theme }) => ({
        borderRadius: theme.shape.borderRadius,
        fontSize: '0.72rem',
        fontWeight: 500,
        padding: '6px 10px',
        backgroundColor: theme.palette.mode === 'dark' ? '#f5f5f5' : '#1a1a1a',
        color: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
      }),
      arrow: ({ theme }) => ({
        color: theme.palette.mode === 'dark' ? '#f5f5f5' : '#1a1a1a',
      }),
    },
  },
  MuiSkeleton: {
    defaultProps: { animation: 'wave' },
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: theme.shape.borderRadius,
        backgroundColor: theme.palette.mode === 'dark'
          ? 'rgba(255,255,255,0.07)'
          : 'rgba(0,0,0,0.06)',
        '&::after': {
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
        },
      }),
    },
  },
  MuiInputLabel: {
    styleOverrides: {
      root: ({ theme }) => ({
        '&.Mui-focused': { color: theme.palette.primary.main },
      }),
    },
  },
  MuiBadge: {
    styleOverrides: {
      badge: { fontWeight: 600, fontSize: '0.6875rem' },
    },
  },
};

export default Components;
