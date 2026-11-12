<?php

namespace Statamic\Collaboration;

use Illuminate\Support\Facades\Broadcast;
use Statamic\Facades\Entry;
use Statamic\Facades\User;
use Statamic\Providers\AddonServiceProvider;
use Statamic\Statamic;

class ServiceProvider extends AddonServiceProvider
{
    protected $vite = [
        'input' => ['resources/js/collaboration.js'],
        'publicDirectory' => 'resources/dist',
        'hotFile' => __DIR__.'/../resources/dist/hot',
    ];

    public function bootAddon()
    {
        Statamic::provideToScript(['collaboration' => config('collaboration')]);

        Broadcast::channel('entry.{id}.{site}', function ($user, $id, $site) {
            $user = User::fromUser($user);

            if (! $entry = Entry::find($id)) {
                return false;
            }

            if (str_replace('.', '_', $entry->locale()) !== $site) {
                return false;
            }

            if (! $user->can('access cp') || ! $user->can('edit', $entry)) {
                return false;
            }

            return [
                'name' => $user->name(),
                'id' => $user->id(),
                'title' => $user->title(),
                'email' => $user->email(),
                'avatar' => $user->avatar(),
                'initials' => $user->initials(),
            ];
        }, ['guards' => [config('statamic.users.guards.cp')]]);
    }
}
