import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import vue from '@vitejs/plugin-vue2';

// old config...
// mix.js('resources/js/collaboration.js', 'dist/js');
// mix.copy('resources/audio', 'dist/audio');

export default defineConfig({
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
