let mix = require('laravel-mix');

mix.js('resources/js/collaboration.js', 'dist/js');
mix.copy('resources/audio', 'dist/audio');
