import Manager from './Manager';
const manager = new Manager;

Statamic.booting(() => {
    Statamic.component('CollaborationStatusBar', require('./StatusBar.vue'));
    Statamic.component('CollaborationBlockingNotification', require('./BlockingNotification.vue'));

    Statamic.$store.registerModule('collaboration', {
        namespaced: true
    });
});

Statamic.$echo.booted(Echo => {
    manager.echo = Echo;
    manager.boot();
});

Statamic.$events.$on('publish-container-created', container => {
    manager.addWorkspace(container);
    window.addEventListener('unload', () => manager.destroyWorkspace(container));
});

Statamic.$events.$on('publish-container-destroyed', container => {
    manager.destroyWorkspace(container);
});
