import type { Components, Theme } from '@mui/material/styles';

const Components: Components<Theme> = {
  MuiCssBaseline: {
    styleOverrides: {
      '*': {
        boxSizing: 'border-box',
      },
      html: {
        scrollBehavior: 'smooth',
      },
      body: {
        backgroundColor: '#f3f4f6',
      },
      a: {
        textDecoration: 'none',
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: '16px',
        border: '1px solid #e5eaef',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        transition: 'all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
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
      subheader: {
        fontSize: '0.75rem',
        color: '#5A6A85',
      },
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
      containedPrimary: {
        '&:hover': {
          backgroundColor: '#e65c00',
        },
      },
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
      colorPrimary: {
        backgroundColor: '#fff1e6',
        color: '#ff6600',
      },
      colorSuccess: {
        backgroundColor: '#E6FFFA',
        color: '#13DEB9',
      },
      colorWarning: {
        backgroundColor: '#FEF5E5',
        color: '#FFAE1F',
      },
      colorError: {
        backgroundColor: '#FDEDE8',
        color: '#FA896B',
      },
      colorInfo: {
        backgroundColor: '#f1f5f9',
        color: '#64748b',
      },
    },
  },
  MuiTextField: {
    defaultProps: {
      variant: 'outlined',
      size: 'small',
    },
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: '12px',
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#ff6600',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#ff6600',
            borderWidth: '2px',
          },
        },
      },
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
      root: {
        backgroundColor: '#ffffff',
        color: '#2A3547',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
        backdropFilter: 'blur(20px)',
      },
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: '14px',
        gap: '12px',
        marginBottom: '2px',
        padding: '8px 12px',
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: '#f3f4f6',
        },
        '&.Mui-selected': {
          backgroundColor: '#fff1e6',
          color: '#ff6600',
          '&:hover': {
            backgroundColor: '#ffe3cc',
          },
          '& .MuiListItemIcon-root': {
            color: '#ff6600',
          },
        },
      },
    },
  },
  MuiListItemIcon: {
    styleOverrides: {
      root: {
        minWidth: '36px',
        color: '#5A6A85',
      },
    },
  },
  MuiLinearProgress: {
    styleOverrides: {
      root: {
        borderRadius: '8px',
        height: '6px',
        backgroundColor: '#e5e7eb',
      },
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
      root: {
        '& .MuiTableCell-root': {
          fontWeight: 600,
          fontSize: '0.75rem',
          color: '#5A6A85',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          borderBottom: '2px solid #e5eaef',
        },
      },
    },
  },
  MuiTableRow: {
    styleOverrides: {
      root: {
        '&:hover': {
          backgroundColor: '#f3f4f6',
        },
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        padding: '12px 16px',
        borderBottom: '1px solid #e5eaef',
        fontSize: '0.875rem',
      },
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
    styleOverrides: {
      tooltip: {
        borderRadius: '8px',
        fontSize: '0.75rem',
      },
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
