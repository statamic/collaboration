<?php

namespace Statamic\Collaboration;

use Illuminate\Support\Facades\Broadcast;
use Statamic\Facades\User;
use Statamic\Providers\AddonServiceProvider;

class ServiceProvider extends AddonServiceProvider
{
    protected $vite = [
        'input' => ['resources/js/collaboration.js'],
        'publicDirectory' => 'resources/dist',
        'hotFile' => __DIR__.'/../resources/dist/hot',
    ];

    public function boot()
    {
        parent::boot();

        Broadcast::channel('entry.{id}.{site}', function ($user, $id, $site) {
            $user = User::fromUser($user);
            
            return [
                'name' => $user->name(),
                'id' => $user->id(),
                'title' => $user->title(),
                'email' => $user->email(),
                'avatar' => $user->avatar(),
                'initials' => $user->initials(),
            ];
        });
    }
}
