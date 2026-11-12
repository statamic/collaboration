<?php

namespace Statamic\Collaboration\Tests;

use Statamic\Collaboration\ServiceProvider;
use Statamic\Testing\AddonTestCase;

abstract class TestCase extends AddonTestCase
{
    protected string $addonServiceProvider = ServiceProvider::class;
}
