// Tailwind runs only on the UI kit's stylesheet (`@awaisa/ui/styles.css`, shadcn); the app's own
// CSS Modules have no Tailwind in them and pass through unchanged.
const config = {
  plugins: { '@tailwindcss/postcss': {} },
}

export default config
