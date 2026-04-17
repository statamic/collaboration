import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import statamic from '@statamic/cms/vite-plugin';
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/vendor/collaboration/build",
  plugins: [
    statamic(),
    tailwindcss(),
    laravel({
      input: ["resources/js/collaboration.js", "resources/css/cp.css"],
      refresh: true,
      publicDirectory: "resources/dist",
      hotFile: "resources/dist/hot",
    }),
  ],
});
