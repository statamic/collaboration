<?php

namespace Statamic\Collaboration;

use Illuminate\Support\Facades\Broadcast;
use Statamic\Extend\ServiceProvider as BaseProvider;

class ServiceProvider extends BaseProvider
{
    protected $scripts = [__DIR__.'/../resources/js/collaboration.js'];

    public function boot()
    {
        parent::boot();

        Broadcast::channel('entry.{id}.{site}', function ($user, $id, $site) {
            return $user->toArray();
        });
    }
}
