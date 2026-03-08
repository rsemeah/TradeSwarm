import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        foreground: "#f2f2f2",
        card: {
          DEFAULT: "#111111",
          foreground: "#f2f2f2",
        },
        border: "#1f1f1f",
        muted: {
          DEFAULT: "#111111",
          foreground: "#6b6b6b",
        },
        // Forest green — trade direction / performance / GO
        primary: {
          DEFAULT: "#1f9d73",
          hover: "#137a57",
          active: "#0e5f43",
          foreground: "#f2f2f2",
        },
        // Champagne gold — system / governance / institutional layer
        accent: {
          DEFAULT: "#c6a75e",
          hover: "#e1c27a",
          foreground: "#0a0a0a",
        },
        // Risk
        warning: "#b8860b",
        danger: "#8b0000",
        secondary: {
          DEFAULT: "#6b6b6b",
          foreground: "#f2f2f2",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "SF Mono", "Menlo", "monospace"],
      },
      borderRadius: {
        DEFAULT: "10px",
      },
      maxWidth: {
        phone: "420px",
      },
    },
  },
  plugins: [],
}

export default config
