import Collaborator from './Collaborator';
const collaborator = new Collaborator;

Statamic.$echo.booted(Echo => {
    collaborator.echo = Echo;
    collaborator.start();
});

Statamic.$events.$on('publish-container-created', container => {
    collaborator.container = container;
    collaborator.start();
});

