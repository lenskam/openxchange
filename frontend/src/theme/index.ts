import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#004ac6",
      light: "#2563eb",
      dark: "#003ea8",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#505f76",
      light: "#d0e1fb",
      dark: "#38485d",
      contrastText: "#ffffff",
    },
    error: {
      main: "#ba1a1a",
      light: "#ffdad6",
      dark: "#93000a",
      contrastText: "#ffffff",
    },
    background: {
      default: "#f7f9fb",
      paper: "#ffffff",
    },
    text: {
      primary: "#191c1e",
      secondary: "#434655",
    },
    divider: "#c3c6d7",
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontSize: "32px",
      lineHeight: "40px",
      letterSpacing: "-0.02em",
      fontWeight: 600,
    },
    h6: {
      fontSize: "20px",
      lineHeight: "28px",
      fontWeight: 600,
    },
    subtitle1: {
      color: "#434655",
      fontSize: "14px",
      lineHeight: "20px",
    },
    body2: {
      fontSize: "14px",
      lineHeight: "20px",
    },
    caption: {
      fontSize: "12px",
      lineHeight: "16px",
      letterSpacing: "0.05em",
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
          fontWeight: 600,
          fontSize: "14px",
          lineHeight: "20px",
          padding: "8px 16px",
        },
        contained: {
          boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow:
            "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
          border: "1px solid rgba(226, 232, 240, 0.8)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-head": {
            fontWeight: 600,
            fontSize: "12px",
            lineHeight: "16px",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "#434655",
            backgroundColor: "#f2f4f6",
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottomColor: "#c3c6d7",
          padding: "16px 24px",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

export default theme;
