import plugin from "tailwindcss/plugin";
import { colors, fonts, radii, screens, shadows, spacing } from "./tokens.js";

const preset = {
  darkMode: "class",
  theme: {
    screens,
    extend: {
      colors,
      fontFamily: fonts,
      borderRadius: radii,
      spacing,
      boxShadow: {
        focus: shadows.focus,
        card: shadows.card
      }
    }
  },
  plugins: [
    plugin(({ addComponents, addBase, theme }) => {
      addBase({
        body: {
          fontFamily: theme("fontFamily.sans")?.join(", ") || "Inter",
          backgroundColor: "var(--bg-main)",
          color: "var(--text-primary)"
        }
      });

      addComponents({
        ".btn": {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "600",
          borderRadius: theme("borderRadius.lg"),
          padding: `${theme("spacing.3") ?? "0.75rem"} ${theme("spacing.4") ?? "1rem"}`,
          transitionProperty: "color, background-color, border-color, box-shadow",
          transitionDuration: "150ms",
          '&:focus-visible': {
            outline: 'none',
            boxShadow: theme('boxShadow.focus')
          },
          '&:disabled': {
            opacity: '.55',
            cursor: 'not-allowed'
          }
        },
        ".btn-primary": {
          backgroundColor: colors.primary[600],
          color: '#fff',
          '&:hover': { backgroundColor: colors.primary[700] }
        },
        ".btn-outline": {
          borderWidth: "2px",
          borderColor: colors.primary[600],
          color: colors.primary[600],
          backgroundColor: "transparent",
          '&:hover': { backgroundColor: colors.primary[50] }
        },
        ".card": {
          borderRadius: theme("borderRadius.xl"),
          borderWidth: "1px",
          borderColor: colors.slate[200],
          backgroundColor: '#fff',
          boxShadow: theme('boxShadow.card')
        },
        ".badge": {
          display: 'inline-flex',
          alignItems: 'center',
          fontWeight: '600',
          fontSize: '0.75rem',
          borderRadius: theme('borderRadius.pill'),
          paddingInline: theme('spacing.3') ?? '0.75rem',
          paddingBlock: '0.25rem'
        }
      });
    })
  ]
};

export default preset;
export { preset };
export * from "./tokens.js";
