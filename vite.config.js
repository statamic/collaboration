import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import statamic from '@statamic/cms/vite-plugin';

export default defineConfig({
    base: '/vendor/collaboration/build',
    plugins: [
        statamic(),
        laravel({
            input: [
                'resources/js/collaboration.js'
            ],
            refresh: true,
            publicDirectory: 'resources/dist',
            hotFile: 'resources/dist/hot',
        }),
    ]
});
