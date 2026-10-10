import type { Config } from "tailwindcss";

// Colors come from CSS variables (see globals.css) so the whole theme
// can be re-skinned in ONE place without touching components.
const token = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: token("--brand-50"),
          100: token("--brand-100"),
          200: token("--brand-200"),
          500: token("--brand-500"),
          600: token("--brand-600"),
          700: token("--brand-700"),
          900: token("--brand-900"),
        },
        accent: { 400: token("--accent-400"), 500: token("--accent-500") },
        green: { 500: token("--green-500"), 600: token("--green-600") },
        blue: { 500: token("--blue-500") },
        night: {
          DEFAULT: token("--night"),
          line: token("--night-line"),
          muted: token("--night-muted"),
          btn: token("--night-btn"),
        },
        ink: token("--ink"),
        muted: token("--muted"),
        line: token("--line"),
        page: token("--page"),
        danger: token("--danger"),
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgb(var(--ink) / 0.05), 0 30px 70px -28px rgb(var(--brand-900) / 0.35)",
      },
    },
  },
  plugins: [],
};
export default config;
