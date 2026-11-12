<?php

namespace Statamic\Collaboration\Tests;

use Illuminate\Support\Facades\Broadcast;
use PHPUnit\Framework\Attributes\Test;

class ServiceProviderTest extends TestCase
{
    #[Test]
    public function it_registers_the_entry_broadcast_channel()
    {
        $this->assertArrayHasKey('entry.{id}.{site}', Broadcast::getChannels()->all());
    }
}
