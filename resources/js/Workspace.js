export default class Workspace {

    constructor(container) {
        this.container = container;
        this.echo = null;
        this.started = false;

        this.debouncedBroadcastValueChange = _.debounce(function (payload) {
            this.broadcastValueChange(payload);
        }, 500);
    }

    start() {
        if (this.started) return;

        this.initializeEcho();
        this.started = true;
    }

    initializeEcho() {
        const reference = this.container.reference.replace('::', '.');
        const name = `${reference}.${this.container.site}`;

        this.channel = this.echo.join(name);

        this.channel.here(users => {
            this.subscribeToVuexMutations();
            const names = users.map(user => user.name).join(' ');
            Statamic.$notify.success(`Users here: ${names}`);
        });

        this.channel.joining(user => {
            Statamic.$notify.success(`${user.name} has joined.`);
        });

        this.channel.leaving(user => {
            Statamic.$notify.success(`${user.name} has left.`);
        });

        this.channel.listenForWhisper('updated', e => {
            this.applyBroadcastedValueChange(e);
        });
    }

    subscribeToVuexMutations() {
        Statamic.$store.subscribe((mutation, state) => {
            if (mutation.type === `publish/${this.container.name}/setValue`) {
                this.debouncedBroadcastValueChange(mutation.payload);
            }
        });
    }

    broadcastValueChange({ handle, value, user }) {
        // Only my own change events should be broadcasted. Otherwise when other users receive
        // the broadcast, it will be re-broadcasted, and so on, to infinity and beyond.
        if (Statamic.$config.get('userId') == user) {
            this.channel.whisper('updated', { handle, value, user });
        }
    }

    applyBroadcastedValueChange(payload) {
        Statamic.$store.dispatch(`publish/${this.container.name}/setValue`, payload);
    }
}
