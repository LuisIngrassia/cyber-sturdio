import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/",
  server: {
    watch: {
      // models-raw/ son los packs sin procesar: miles de archivos que no
      // forman parte del build. Sin ignorarlos, Vite los vigila y cualquier
      // cosa que se descomprima ahí adentro recarga la página.
      ignored: ["**/models-raw/**"],
    },
  },
  build: {
    rollupOptions: {
      output: {
        // three y el ecosistema r3f pesan bastante y casi nunca cambian. En su
        // propio chunk se cachean entre deploys, en vez de invalidarse cada vez
        // que tocamos una escena.
        //
        // Va como función y no como objeto porque Vite 8 usa Rolldown, que
        // sacó la forma de objeto de `manualChunks`.
        manualChunks: (id: string) =>
          /node_modules[\\/](three|@react-three)[\\/]/.test(id)
            ? "three"
            : undefined,
      },
    },
  },
});
