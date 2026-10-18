// El plugin de Astro se agrega en el Hito 5 (overrides para *.astro).
/** @type {import('prettier').Config} */
const config = {
  singleQuote: true,
  semi: true,
  trailingComma: 'all',
  printWidth: 100,
};

export default config;
