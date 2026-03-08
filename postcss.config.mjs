/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    // Use the dedicated PostCSS adapter for Tailwind v4+
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}

export default config
