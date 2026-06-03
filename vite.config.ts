import { defineConfig } from 'vite';

// En GitHub Pages el sitio se sirve desde https://<usuario>.github.io/<repo>/,
// así que el base debe ser "/<repo>/". El workflow lo inyecta vía BASE_PATH.
// En local (npm run dev) queda en "/".
export default defineConfig({
  base: process.env.BASE_PATH || '/',
});
