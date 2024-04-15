<!-- statamic:hide -->
# Collaboration

> Real-time collaboration and multi-user authoring for Statamic Pro.
<!-- /statamic:hide -->

## Features

- Presence indicators when multiple people have the same entry opened.
- Fields get locked when someone else focuses them.
- Updates to field values are reflected to everyone.

## Installation

You can install and configure the Collaboration addon using a single command:

```
php please install:collaboration
```

The command will install the `statamic/collaboration` addon, setup Laravel's broadcast scaffolding and prompt you to select which broadcast driver you wish to use.

For more information on the specifics for each broadcast driver, please review the following:

### Laravel Reverb

The `install:collaboration` command will install Laravel Reverb into your application. After installation, run `php artisan reverb:start` to run Reverb's WebSockets server, then the Collaboration addon should start working in the Control Panel.

When you deploy your application to a server, you will need to run the Reverb WebSockets server as a daemon (`php artisan reverb:start`). If you're using Laravel Forge, there's a Reverb toggle in your site's "Application" panel.

For further information on Reverb, please review the [Laravel documentation](https://laravel.com/docs/master/reverb#introduction).

### Pusher

The `install:collaboration` command will install [Pusher](https://pusher.com/)'s PHP SDK into your application. After installation, you should add your Pusher credentials to your `.env` file:

```
PUSHER_APP_ID="your-pusher-app-id"
PUSHER_APP_KEY="your-pusher-key"
PUSHER_APP_SECRET="your-pusher-secret"
PUSHER_HOST=
PUSHER_PORT=443
PUSHER_SCHEME="https"
PUSHER_APP_CLUSTER="mt1"
```

You should also ensure you have enabled the "Client Events" setting (found under the "App Settings" page in the Pusher Dashboard).

### Other

If you're planning on using a different broadcasting driver, there are a few additional steps you'll need to take to get it working:

1. Install & configure your broadcasting driver (obviously)
2. Update the `BROADCAST_DRIVER` in your `.env`
3. Create a `resources/js/cp.js` file and add it to the Control Panel.
    * [For more information, follow this guide on our documentation site](https://statamic.dev/extending/control-panel#adding-css-and-js-assets).
4. In your `resources/js/cp.js` file, register a callback to override Statamic's [Echo](https://laravel.com/docs/10.x/broadcasting#client-side-installation) config:

```js
Statamic.booting(() => {
    Statamic.$echo.config(() => ({
        broadcaster: "pusher",
        key: Statamic.$config.get('broadcasting.pusher.key'),
        cluster: Statamic.$config.get('broadcasting.pusher.cluster'),
        wsHost: Statamic.$config.get('broadcasting.pusher.host'),
        wsPort: Statamic.$config.get('broadcasting.pusher.port'),
        wssPort: Statamic.$config.get('broadcasting.pusher.port'),
        forceTLS: false,
        encrypted: true,
        disableStats: true,
        enabledTransports: ["ws", "wss"],
    }));
});
```

## Configuration

### Sound Effects

By default, the Collaboration addon plays sound effects when other users join & leave entries.

If you wish to disable these, you may publish the configuration file (via `php artisan vendor:publish --tag=collaboration`) and set `sound_effects` to `false`.

```php
// config/collaboration.php

return [
    'sound_effects' => false,
];
```

## Configuration

### Sound Effects

By default, the Collaboration addon plays sound effects when other users join & leave entries.

If you wish to disable these, you may publish the configuration file (via `php artisan vendor:publish --tag=collaboration`) and set `sound_effects` to `false`.

```php
// config/collaboration.php

return [
    'sound_effects' => false,
];
```

## Advanced Usage

When the ["meta data"](https://statamic.dev/extending/fieldtypes#meta-data) of a fieldtype is updated, it will be broadcast to the other users in the channel. If you have a fieldtype that contains a large amount of meta data, and it gets updated (some may just provide initial state and never change), you may consider specifying the fields that should be broadcast. This could help keep message sizes smaller and improve performance.

In your fieldtype's `preload` method, you can use the special `__collaboration` key to list the fields.

``` php
public function preload()
{
    return [
        'hello' => 'world',
        'foo' => 'bar',
        '__collaboration' => ['foo'],
    ];
}
```

When the meta data gets updated, only the `foo` value will be broadcast. The remaining values will get merged in automatically.
