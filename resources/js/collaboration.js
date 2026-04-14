import Manager from './Manager';
import StatusBar from './StatusBar.vue';
import BlockingNotification from './BlockingNotification.vue';

const manager = new Manager;

Statamic.booting(() => {
    Statamic.$components.register('CollaborationStatusBar', StatusBar);
    Statamic.$components.register('CollaborationBlockingNotification', BlockingNotification);
});

Statamic.$events.$on('publish-container-created', (container) => {
    if (!container.reference) return;
    manager.addWorkspace(container);
});

Statamic.$events.$on('publish-container-destroyed', (container) => {
    if (manager.workspaces[container.name]) {
        manager.destroyWorkspace(container);
    }
});

Statamic.$echo.booted(Echo => {
    manager.echo = Echo;
    manager.boot();
});
