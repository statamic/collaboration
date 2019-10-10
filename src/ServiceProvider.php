<?php

namespace Statamic\Collaboration;

use Illuminate\Support\Facades\Broadcast;
use Statamic\Providers\AddonServiceProvider as BaseProvider;

class ServiceProvider extends BaseProvider
{
    protected $scripts = [__DIR__.'/../dist/js/collaboration.js'];
    protected $publishables = [__DIR__.'/../dist/audio' => 'audio'];

    public function boot()
    {
        parent::boot();

        Broadcast::channel('entry.{id}.{site}', function ($user, $id, $site) {
            return $user->toArray();
        });
    }
}
