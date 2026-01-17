import { createTheme } from '@mui/material/styles';

/**
 * TechMart Analytics Dashboard Theme
 *
 * Custom Material-UI theme with professional color scheme,
 * typography, and component styling.
 */
export const theme = createTheme({
  palette: {
    mode: 'light',

    // Primary colors - TechMart brand blue
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff',
    },

    // Secondary colors - Accent pink/purple
    secondary: {
      main: '#dc004e',
      light: '#f44336',
      dark: '#c2185b',
      contrastText: '#ffffff',
    },

    // Semantic colors for status indicators
    success: {
      main: '#4caf50',
      light: '#66bb6a',
      dark: '#388e3c',
      contrastText: '#ffffff',
    },

    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
      contrastText: '#ffffff',
    },

    error: {
      main: '#f44336',
      light: '#ef5350',
      dark: '#d32f2f',
      contrastText: '#ffffff',
    },

    info: {
      main: '#2196f3',
      light: '#42a5f5',
      dark: '#1976d2',
      contrastText: '#ffffff',
    },

    // Background colors
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },

    // Text colors
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      disabled: 'rgba(0, 0, 0, 0.38)',
    },

    // Divider color
    divider: 'rgba(0, 0, 0, 0.12)',
  },

  typography: {
    fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.6,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    },
  },

  // Component customizations
  components: {
    // Card component
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          transition: 'box-shadow 0.3s ease-in-out',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          },
        },
      },
    },

    // CardHeader component
    MuiCardHeader: {
      styleOverrides: {
        root: {
          paddingBottom: 8,
        },
        title: {
          fontSize: '1.125rem',
          fontWeight: 600,
        },
        action: {
          marginTop: 0,
          marginRight: -8,
        },
      },
    },

    // Button component
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          },
        },
      },
    },

    // TextField component
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
    },

    // Table component
    MuiTable: {
      styleOverrides: {
        root: {
          borderCollapse: 'separate',
          borderSpacing: '0',
        },
      },
    },

    // TableCell component
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        },
        head: {
          fontWeight: 600,
          backgroundColor: 'rgba(0,0,0,0.02)',
        },
      },
    },

    // Chip component
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
      },
    },

    // AppBar component
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        },
      },
    },

    // Drawer component
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(0,0,0,0.06)',
        },
      },
    },

    // ListItem component
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '4px 8px',
        },
      },
    },

    // Alert component
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        standardSuccess: {
          backgroundColor: '#e8f5e9',
          color: '#2e7d32',
        },
        standardWarning: {
          backgroundColor: '#fff3e0',
          color: '#ef6c00',
        },
        standardError: {
          backgroundColor: '#ffebee',
          color: '#c62828',
        },
        standardInfo: {
          backgroundColor: '#e3f2fd',
          color: '#1565c0',
        },
      },
    },

    // LinearProgress component
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 6,
        },
      },
    },

    // CircularProgress component
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: '#1976d2',
        },
      },
    },

    // Tabs component
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: '3px 3px 0 0',
        },
      },
    },

    // Tab component
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          minHeight: 48,
        },
      },
    },
  },

  // Shape customization
  shape: {
    borderRadius: 8,
  },

  // Shadows (custom shadow values)
  shadows: [
    'none',
    '0 1px 3px rgba(0,0,0,0.08)',
    '0 2px 8px rgba(0,0,0,0.08)',
    '0 4px 16px rgba(0,0,0,0.12)',
    '0 6px 24px rgba(0,0,0,0.15)',
    '0 8px 32px rgba(0,0,0,0.18)',
    '0 10px 40px rgba(0,0,0,0.20)',
    '0 12px 48px rgba(0,0,0,0.22)',
    '0 14px 56px rgba(0,0,0,0.24)',
    '0 16px 64px rgba(0,0,0,0.26)',
    '0 18px 72px rgba(0,0,0,0.28)',
    '0 20px 80px rgba(0,0,0,0.30)',
    '0 22px 88px rgba(0,0,0,0.32)',
    '0 24px 96px rgba(0,0,0,0.34)',
    '0 26px 104px rgba(0,0,0,0.36)',
    '0 28px 112px rgba(0,0,0,0.38)',
    '0 30px 120px rgba(0,0,0,0.40)',
    '0 32px 128px rgba(0,0,0,0.42)',
    '0 34px 136px rgba(0,0,0,0.44)',
    '0 36px 144px rgba(0,0,0,0.46)',
    '0 38px 152px rgba(0,0,0,0.48)',
    '0 40px 160px rgba(0,0,0,0.50)',
    '0 42px 168px rgba(0,0,0,0.52)',
    '0 44px 176px rgba(0,0,0,0.54)',
    '0 46px 184px rgba(0,0,0,0.56)',
  ],

  // Z-index values
  zIndex: {
    mobileStepper: 1000,
    speedDial: 1050,
    appBar: 1100,
    drawer: 1200,
    modal: 1300,
    snackbar: 1400,
    tooltip: 1500,
  },
});

export default theme;
