<!-- statamic:hide -->
# Collaboration

> Realtime collaboration and multi-user authoring for Statamic Pro.
<!-- /statamic:hide -->

## Features

- Presence indicators when multiple people have the same entry opened.
- Fields get locked when someone else focuses them.
- Updates to field values are reflected to everyone.

## Installation

Require it using Composer, as well as the Pusher library.

```
composer require statamic/collaboration
composer require pusher/pusher-php-server "^5.0"
```

Uncomment `BroadcastServiceProvider` from `config/app.php`'s `providers` array if it isn't already.

``` php
'providers' => [
    // ...
    App\Providers\BroadcastServiceProvider::class,
    // ...
]
```

In your `.env` file, make sure the `pusher` broadcast driver is used:

```
BROADCAST_DRIVER=pusher
```

Create an app inside your [Pusher account](https://pusher.com). Make sure "Client Events" are enabled.

Add your Pusher app credentials to your `.env` file:

```
PUSHER_APP_ID=
PUSHER_APP_KEY=
PUSHER_APP_SECRET=
PUSHER_APP_CLUSTER=
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
