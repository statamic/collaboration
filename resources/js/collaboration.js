import Manager from './Manager';
const manager = new Manager;

Statamic.$echo.booted(Echo => {
    manager.echo = Echo;
    manager.boot();
});

Statamic.$events.$on('publish-container-created', container => {
    manager.addWorkspace(container);
});

