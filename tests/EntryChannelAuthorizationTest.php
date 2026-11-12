<?php

namespace Statamic\Collaboration\Tests;

use Illuminate\Support\Facades\Broadcast;
use PHPUnit\Framework\Attributes\Test;
use Statamic\Facades\Collection;
use Statamic\Facades\Entry;
use Statamic\Facades\Role;
use Statamic\Facades\Site;
use Statamic\Facades\User;

class EntryChannelAuthorizationTest extends TestCase
{
    private $entry;

    protected function setUp(): void
    {
        parent::setUp();

        Site::setSites([
            'en' => ['name' => 'English', 'url' => '/', 'locale' => 'en_US'],
            'fr' => ['name' => 'French', 'url' => '/fr/', 'locale' => 'fr_FR'],
        ]);

        Collection::make('blog')->sites(['en', 'fr'])->save();

        $this->entry = tap(Entry::make()->id('abc')->collection('blog')->locale('en')->slug('hello'))->save();
        Entry::make()->id('abc-fr')->collection('blog')->locale('fr')->origin('abc')->slug('bonjour')->save();
    }

    protected function defineEnvironment($app)
    {
        $app['config']->set('broadcasting.default', 'null');
        $app['config']->set('statamic.editions.pro', true);
        $app['config']->set('statamic.system.multisite', true);
    }

    private function authorize($user, $id, $site)
    {
        $callback = Broadcast::driver()->getChannels()->get('entry.{id}.{site}');

        return $callback($user, $id, $site);
    }

    private function userWithPermissions(array $permissions)
    {
        Role::make('test')->permissions($permissions)->save();

        return tap(User::make()->email('editor@example.com')->assignRole('test'))->save();
    }

    #[Test]
    public function editor_can_join()
    {
        $user = $this->userWithPermissions(['access cp', 'edit blog entries', 'access en site', 'access fr site']);

        $this->assertIsArray($this->authorize($user, 'abc', 'en'));
        $this->assertSame($user->id(), $this->authorize($user, 'abc', 'en')['id']);
        $this->assertIsArray($this->authorize($user, 'abc-fr', 'fr'));
    }

    #[Test]
    public function super_user_can_join()
    {
        $user = tap(User::make()->email('super@example.com')->makeSuper())->save();

        $this->assertIsArray($this->authorize($user, 'abc', 'en'));
    }

    #[Test]
    public function user_without_edit_permission_cannot_join()
    {
        $user = $this->userWithPermissions(['access cp', 'view blog entries', 'access en site']);

        $this->assertFalse($this->authorize($user, 'abc', 'en'));
    }

    #[Test]
    public function user_without_cp_access_cannot_join()
    {
        $user = $this->userWithPermissions(['edit blog entries', 'access en site']);

        $this->assertFalse($this->authorize($user, 'abc', 'en'));
    }

    #[Test]
    public function user_without_site_access_cannot_join()
    {
        $user = $this->userWithPermissions(['access cp', 'edit blog entries', 'access en site']);

        $this->assertFalse($this->authorize($user, 'abc-fr', 'fr'));
    }

    #[Test]
    public function nonexistent_entry_cannot_be_joined()
    {
        $user = $this->userWithPermissions(['access cp', 'edit blog entries', 'access en site']);

        $this->assertFalse($this->authorize($user, 'missing', 'en'));
    }

    #[Test]
    public function mismatched_site_cannot_be_joined()
    {
        $user = $this->userWithPermissions(['access cp', 'edit blog entries', 'access en site', 'access fr site']);

        $this->assertFalse($this->authorize($user, 'abc', 'fr'));
        $this->assertFalse($this->authorize($user, 'abc', 'nonexistent'));
    }
}
