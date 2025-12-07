import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  ssr: {
    noExternal: ["@syncfusion/ej2-*"],
  },
  optimizeDeps: {
    exclude: ["@syncfusion/ej2-*"], // Exclude from dependency optimization
  },
});
