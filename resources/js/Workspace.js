export default class Workspace {

    constructor(container) {
        this.container = container;
        this.echo = null;
        this.started = false;
        this.storeSubscriber = null;
        this.lastValues = {};

        this.debouncedBroadcastValueChange = _.debounce(function (payload) {
            this.broadcastValueChange(payload);
        }, 500);
    }

    start() {
        if (this.started) return;

        this.initializeEcho();
        this.initializeStore();
        this.initializeFocus();
        this.container.pushComponent({
            name: 'CollaborationAvatars',
            props: {
                channelName: this.channelName,
            }
        });
        this.started = true;
    }

    destroy() {
        this.storeSubscriber.apply();
        this.echo.leave(this.channelName);
    }

    initializeEcho() {
        const reference = this.container.reference.replace('::', '.');
        this.channelName = `${reference}.${this.container.site}`;
        this.channel = this.echo.join(this.channelName);

        this.channel.here(users => {
            this.subscribeToVuexMutations();
            Statamic.$store.commit(`collaboration/${this.channelName}/setUsers`, users);
        });

        this.channel.joining(user => {
            Statamic.$store.commit(`collaboration/${this.channelName}/addUser`, user);
            Statamic.$notify.success(`${user.name} has joined.`);

            // todo: send the whole state to the new person
        });

        this.channel.leaving(user => {
            Statamic.$store.commit(`collaboration/${this.channelName}/removeUser`, user);
            Statamic.$notify.success(`${user.name} has left.`);
        });

        this.channel.listenForWhisper('updated', e => {
            this.applyBroadcastedValueChange(e);
        });

        this.channel.listenForWhisper('focus', ({ user, handle }) => {
            this.debug(`Heard that user has changed focus`, { user, handle });
            this.focus(user, handle);
            Statamic.$store.commit(`publish/${this.container.name}/lockField`, { user, handle });
        });

        this.channel.listenForWhisper('blur', ({ user, handle }) => {
            this.debug(`Heard that user has blurred`, { user, handle });
            this.blur(user);
            Statamic.$store.commit(`publish/${this.container.name}/unlockField`, handle);
        });
    }

    initializeStore() {
        Statamic.$store.registerModule(['collaboration', this.channelName], {
            namespaced: true,
            state: {
                users: [],
                focus: {},
            },
            mutations: {
                setUsers(state, users) {
                    state.users = users;
                },
                addUser(state, user) {
                    state.users.push(user);
                },
                removeUser(state, removedUser) {
                    state.users = state.users.filter(user => user.id !== removedUser.id);
                },
                focus(state, { handle, user }) {
                    Vue.set(state.focus, user, handle);
                },
                blur(state, user) {
                    Vue.delete(state.focus, user);
                }
            }
        });
    }

    initializeFocus() {
        this.container.$on('focus', handle => {
            const user = Statamic.$config.get('userId');
            this.focus(user, handle);
            this.whisper('focus', { user, handle });
        });
        this.container.$on('blur', handle => {
            const user = Statamic.$config.get('userId');
            this.blur(user, handle);
            this.whisper('blur', { user, handle });
        });
    }

    focus(user, handle) {
        Statamic.$store.commit(`collaboration/${this.channelName}/focus`, { user, handle });
    }

    blur(user) {
        Statamic.$store.commit(`collaboration/${this.channelName}/blur`, user);
    }

    subscribeToVuexMutations() {
        this.storeSubscriber = Statamic.$store.subscribe((mutation, state) => {
            switch (mutation.type) {
                case `publish/${this.container.name}/setValue`:
                    this.vuexValueHasBeenSet(mutation.payload);
            }
        });
    }

    // A value has been set in the vuex store.
    // It could have been triggered by the current user editing something,
    // or by the workspace applying a change dispatched by another user editing something.
    vuexValueHasBeenSet(payload) {
        this.debug('Vuex value has been set', payload);
        if (!this.valueHasChanged(payload.handle, payload.value)) {
            // No change? Don't bother doing anything.
            this.debug(`Value for ${payload.handle} has not changed.`, { value: payload.value, lastValue: this.lastValues[payload.handle] });
            return;
        }

        this.rememberValueChange(payload.handle, payload.value);
        this.debouncedBroadcastValueChange(payload);
    }

    rememberValueChange(handle, value) {
        this.debug('Remembering value change', { handle, value });
        this.lastValues[handle] = clone(value);
    }

    valueHasChanged(handle, newValue) {
        const lastValue = this.lastValues[handle] || null;
        return JSON.stringify(lastValue) !== JSON.stringify(newValue);
    }

    broadcastValueChange(payload) {
        // Only my own change events should be broadcasted. Otherwise when other users receive
        // the broadcast, it will be re-broadcasted, and so on, to infinity and beyond.
        if (Statamic.$config.get('userId') == payload.user) {
            this.whisper('updated', payload);
        }
    }

    applyBroadcastedValueChange(payload) {
        this.debug('✅ Applying broadcasted change', payload);
        Statamic.$store.dispatch(`publish/${this.container.name}/setValue`, payload);
    }

    debug(message, args) {
        console.log('[Collaboration]', message, {...args});
    }

    isAlone() {
        return Statamic.$store.state.collaboration[this.channelName].users.length === 1;
    }

    whisper(event, payload) {
        if (this.isAlone()) return;

        this.debug(`📣 Broadcasting "${event}"`, payload);
        this.channel.whisper(event, payload);
    }
}
