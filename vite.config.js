import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import vue from '@vitejs/plugin-vue2';

export default defineConfig({
    base: '/vendor/collaboration/build',
    plugins: [
        laravel({
            input: [
                'resources/js/collaboration.js'
            ],
            refresh: true,
            publicDirectory: 'resources/dist',
            hotFile: 'resources/dist/hot',
        }),
        vue(),
    ],
});
