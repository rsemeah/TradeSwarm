import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        foreground: "#ffffff",
        card: {
          DEFAULT: "#141414",
          foreground: "#ffffff",
        },
        border: "#1f1f1f",
        muted: {
          DEFAULT: "#141414",
          foreground: "#6b6b6b",
        },
        accent: {
          DEFAULT: "#00ff88",
        },
        warning: "#ffcc00",
        danger: "#ff4444",
        primary: {
          DEFAULT: "#00ff88",
          foreground: "#0a0a0a",
        },
        secondary: {
          DEFAULT: "#6b6b6b",
          foreground: "#ffffff",
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
