<?php

namespace Statamic\Collaboration;

use Statamic\Extend\ServiceProvider as BaseProvider;

class ServiceProvider extends BaseProvider
{
    protected $scripts = [__DIR__.'/../resources/js/collaboration.js'];
}
