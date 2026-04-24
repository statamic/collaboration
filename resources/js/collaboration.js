import '../css/cp.css';
import Manager from './Manager';
import StatusBar from './StatusBar.vue';
import BlockingNotification from './BlockingNotification.vue';
const manager = new Manager;

Statamic.booting(() => {
    Statamic.$components.register('CollaborationStatusBar', StatusBar);
    Statamic.$components.register('CollaborationBlockingNotification', BlockingNotification);
});

Statamic.$echo.booted(Echo => {
    manager.echo = Echo;
    manager.boot();

    // When using Pusher or Reverb (both pusher-js under the hood), log connection
    // state transitions to help diagnose why the websocket isn't connecting.
    // Echo here is Statamic's wrapper; the underlying Laravel Echo is at Echo.echo.
    const connection = Echo.echo?.connector?.pusher?.connection;
    if (connection) {
        console.log('[Collaboration] Connection state:', connection.state);
        connection.bind('state_change', ({ previous, current }) => console.log(`[Collaboration] Connection state: ${previous} → ${current}`));
        connection.bind('error', error => console.log('[Collaboration] Connection error:', error));
    }
});

Statamic.$events.$on('publish-container-created', container => {
    if (!container.reference) return;
    manager.addWorkspace(container);
});

Statamic.$events.$on('publish-container-destroyed', container => {
    if (!manager.workspaces[container.name]) return;
    manager.destroyWorkspace(container);
});

window.addEventListener('unload', () => {
    Object.keys(manager.workspaces).forEach(name => manager.destroyWorkspace({ name }));
});
