import type { Components, Theme } from '@mui/material/styles';

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
      '*': {
        boxSizing: 'border-box',
      },
      html: {
        scrollBehavior: 'smooth',
      },
      a: {
        textDecoration: 'none',
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: '16px',
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: theme.palette.mode === 'dark'
          ? '0 2px 8px rgba(0, 0, 0, 0.32)'
          : '0 2px 8px rgba(0, 0, 0, 0.06)',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          borderColor: `${theme.palette.primary.main}40`,
          boxShadow: theme.palette.mode === 'dark'
            ? `0 4px 16px rgba(0,0,0,0.4), 0 0 0 1px ${theme.palette.primary.main}20`
            : `0 4px 16px rgba(0,0,0,0.1), 0 0 0 1px ${theme.palette.primary.main}18`,
        },
      }),
    },
  },
  MuiCardHeader: {
    styleOverrides: {
      root: {
        padding: '24px 24px 0',
      },
      title: {
        fontSize: '1.125rem',
        fontWeight: 600,
      },
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
        '&:last-child': {
          paddingBottom: '24px',
        },
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: '12px',
        textTransform: 'none',
        fontWeight: 600,
        padding: '8px 20px',
        boxShadow: 'none',
        '&:hover': {
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
        },
      },
      sizeSmall: {
        padding: '4px 12px',
        fontSize: '0.75rem',
        borderRadius: '8px',
      },
      sizeLarge: {
        padding: '12px 28px',
        fontSize: '1rem',
        borderRadius: '14px',
      },
      containedPrimary: ({ theme }) => ({
        '&:hover': {
          backgroundColor: theme.palette.primary.dark,
        },
      }),
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        borderRadius: '12px',
        transition: 'all 0.2s ease',
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: '8px',
        fontWeight: 600,
        fontSize: '0.75rem',
      },
      sizeSmall: {
        height: '24px',
        fontSize: '0.6875rem',
      },
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
    defaultProps: {
      variant: 'outlined',
      size: 'small',
    },
    styleOverrides: {
      root: ({ theme }) => ({
        '& .MuiOutlinedInput-root': {
          borderRadius: '12px',
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
    defaultProps: {
      size: 'small',
    },
    styleOverrides: {
      root: {
        borderRadius: '12px',
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        border: 'none',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
      },
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
        borderRadius: '14px',
        gap: '12px',
        marginBottom: '2px',
        padding: '8px 12px',
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: theme.palette.action.hover,
        },
        '&.Mui-selected': {
          backgroundColor: `${theme.palette.primary.main}14`,
          color: theme.palette.primary.main,
          '&:hover': {
            backgroundColor: `${theme.palette.primary.main}24`,
          },
          '& .MuiListItemIcon-root': {
            color: theme.palette.primary.main,
          },
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
        borderRadius: '8px',
        height: '6px',
        backgroundColor: theme.palette.mode === 'dark'
          ? 'rgba(255,255,255,0.12)'
          : theme.palette.grey[200],
      }),
    },
  },
  MuiAvatar: {
    styleOverrides: {
      root: {
        fontSize: '0.875rem',
        fontWeight: 600,
      },
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
        '&:hover': {
          backgroundColor: theme.palette.action.hover,
        },
        '&:last-child .MuiTableCell-root': {
          borderBottom: 'none',
        },
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
      rounded: {
        borderRadius: '12px',
      },
    },
  },
  MuiMenu: {
    styleOverrides: {
      paper: ({ theme }) => ({
        borderRadius: '12px',
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: theme.palette.mode === 'dark'
          ? '0 8px 32px rgba(0,0,0,0.5)'
          : '0 8px 32px rgba(0,0,0,0.12)',
        padding: '4px',
      }),
      list: {
        padding: '4px 0',
      },
    },
  },
  MuiMenuItem: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: '8px',
        fontSize: '0.875rem',
        padding: '8px 12px',
        transition: 'background-color 0.15s ease',
        '&:hover': {
          backgroundColor: theme.palette.action.hover,
        },
        '&.Mui-selected': {
          backgroundColor: `${theme.palette.primary.main}12`,
          '&:hover': {
            backgroundColor: `${theme.palette.primary.main}20`,
          },
        },
      }),
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 600,
        fontSize: '0.875rem',
      },
    },
  },
  MuiTooltip: {
    defaultProps: {
      arrow: true,
    },
    styleOverrides: {
      tooltip: ({ theme }) => ({
        borderRadius: '8px',
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
  MuiInputLabel: {
    styleOverrides: {
      root: ({ theme }) => ({
        '&.Mui-focused': {
          color: theme.palette.primary.main,
        },
      }),
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: '12px',
      },
    },
  },
  MuiBadge: {
    styleOverrides: {
      badge: {
        fontWeight: 600,
        fontSize: '0.6875rem',
      },
    },
  },
};

export default Components;
