import { watch } from 'vue';
import buddyIn from '../audio/buddy-in.mp3'
import buddyOut from '../audio/buddy-out.mp3'

function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

export default class Workspace {

    constructor(container) {
        this.container = container;
        this.echo = null;
        this.started = false;
        this.valuesWatcher = null;
        this.store = null;
        this.lastValues = {};
        this.lastMetaValues = {};
        this.user = Statamic.user;
        this.initialStateUpdated = false;

        this.debouncedBroadcastValueChangeFuncsByHandle = {};
        this.focusWatcher = null;
    }

    start() {
        if (this.started) return;

        this.initializeEcho();
        this.initializeStore();
        this.initializeValuesAndMeta();
        this.initializeHooks();
        this.initializeStatusBar();
        this.initializeFocusBlur();
        this.started = true;
    }

    destroy() {
        if (this.valuesWatcher) {
            this.valuesWatcher();
            this.valuesWatcher = null;
        }
        if (this.focusWatcher) {
            this.focusWatcher();
            this.focusWatcher = null;
        }
        this.echo.leave(this.channelName);
    }

    initializeEcho() {
        const reference = this.container.reference.replaceAll('::', '.');
        this.channelName = `${reference}.${this.container.site.replaceAll('.', '_')}`;
        this.channel = this.echo.join(this.channelName);

        this.channel.here(users => {
            this.initializeValueWatcher();
            this.store.setUsers(users);
        });

        this.channel.joining(user => {
            this.store.addUser(user);
            Statamic.$toast.success(`${user.name} has joined.`);
            this.whisper(`initialize-state-for-${user.id}`, {
                values: this.container.values.value,
                meta: {},
                focus: this.container.fieldFocus.value,
            });

            if (Statamic.$config.get('collaboration.sound_effects')) {
                this.playAudio('buddy-in');
            }
        });

        this.channel.leaving(user => {
            this.store.removeUser(user);
            Statamic.$toast.success(`${user.name} has left.`);
            this.blur(user);

            if (Statamic.$config.get('collaboration.sound_effects')) {
                this.playAudio('buddy-out');
            }
        });

        this.listenForWhisper('updated', e => {
            this.applyBroadcastedValueChange(e);
        });

        this.listenForWhisper('meta-updated', e => {
            this.applyBroadcastedMetaChange(e);
        });

        this.listenForWhisper(`initialize-state-for-${this.user.id}`, payload => {
            if (this.initialStateUpdated) return;
            this.debug('✅ Applying broadcasted state change', payload);
            this.container.setValues(payload.values);
            Object.entries(payload.focus).forEach(([, { user, handle }]) => this.focus(user, handle));
            this.initialStateUpdated = true;
        });

        this.listenForWhisper('focus', ({ user, handle }) => {
            this.debug(`Heard that user has changed focus`, { user, handle });
            this.focus(user, handle);
        });

        this.listenForWhisper('blur', ({ user, handle }) => {
            this.debug(`Heard that user has blurred`, { user, handle });
            this.blur(user, handle);
        });

        this.listenForWhisper('force-unlock', ({ targetUser, originUser }) => {
            this.debug(`Heard that user has requested another be unlocked`, { targetUser, originUser });

            if (targetUser.id !== this.user.id) return;

            document.activeElement.blur();
            this.blur(this.user);
            Statamic.$toast.info(`${originUser.name} has unlocked your editor.`, { duration: false });
        });

        this.listenForWhisper('saved', ({ user }) => {
            Statamic.$toast.success(`Saved by ${user.name}.`);
        });

        this.listenForWhisper('published', ({ user, message }) => {
            Statamic.$toast.success(`Published by ${user.name}.`);
            const messageProp = message
                ? `Entry has been published by ${user.name} with the message: ${message}`
                : `Entry has been published by ${user.name} with no message.`
            Statamic.$components.append('CollaborationBlockingNotification', {
                props: { message: messageProp }
            }).on('confirm', () => window.location.reload());
            this.destroy();
        });

        this.listenForWhisper('revision-restored', ({ user }) => {
            Statamic.$toast.success(`Revision restored by ${user.name}.`);
            Statamic.$components.append('CollaborationBlockingNotification', {
                props: { message: `Entry has been restored to another revision by ${user.name}` }
            }).on('confirm', () => window.location.reload());
            this.destroy();
        });
    }

    initializeStore() {
        const channelName = this.channelName;

        const useStore = Statamic.$pinia.defineStore(`collaboration/${channelName}`, {
            state: () => ({
                users: [],
            }),
            actions: {
                setUsers(users) {
                    this.users = users;
                },
                addUser(user) {
                    this.users.push(user);
                },
                removeUser(removedUser) {
                    this.users = this.users.filter(user => user.id !== removedUser.id);
                },
            },
        });

        this.store = useStore();
    }

    initializeStatusBar() {
        const component = this.container.pushComponent('CollaborationStatusBar', {
            props: {
                channelName: this.channelName,
            }
        });

        component.on('unlock', (targetUser) => {
            this.whisper('force-unlock', { targetUser, originUser: this.user });
        });
    }

    initializeFocusBlur() {
        this.focusWatcher = watch(
            () => this.container.fieldFocus.value[this.user.id]?.handle,
            (newHandle, oldHandle) => {
                if (oldHandle) {
                    this.whisper('blur', { user: this.user, handle: oldHandle });
                }
                if (newHandle) {
                    this.whisper('focus', { user: this.user, handle: newHandle });
                }
            }
        );
    }

    initializeHooks() {
        Statamic.$hooks.on('entry.saved', (resolve, reject, { reference }) => {
            if (reference === this.container.reference) {
                this.whisper('saved', { user: this.user });
            }
            resolve();
        });

        Statamic.$hooks.on('entry.published', (resolve, reject, { reference, message }) => {
            if (reference === this.container.reference) {
                this.whisper('published', { user: this.user, message });
            }
            resolve();
        });

        Statamic.$hooks.on('revision.restored', (resolve, reject, { reference }) => {
            if (reference !== this.container.reference) return resolve();

            this.whisper('revision-restored', { user: this.user });

            setTimeout(resolve, 500);
        });
    }

    focus(user, handle) {
        this.container.focusField(handle, user);
    }

    blur(user, handle = null) {
        handle = handle || this.container.fieldFocus.value[user.id]?.handle;
        if (!handle) return;
        this.container.blurField(handle, user);
    }

    initializeValueWatcher() {
        if (this.valuesWatcher) return;

        this.valuesWatcher = watch(
            this.container.values,
            (newValues) => {
                Object.keys(newValues).forEach(handle => {
                    const newValue = newValues[handle];
                    if (this.valueHasChanged(handle, newValue)) {
                        this.rememberValueChange(handle, newValue);
                        this.debouncedBroadcastValueChangeFuncByHandle(handle)({
                            handle,
                            value: newValue,
                            user: this.user.id,
                        });
                    }
                });
            },
            { deep: true }
        );
    }

    rememberValueChange(handle, value) {
        this.lastValues[handle] = clone(value);
    }

    rememberMetaChange(handle, value) {
        this.lastMetaValues[handle] = clone(value);
    }

    debouncedBroadcastValueChangeFuncByHandle(handle) {
        const func = this.debouncedBroadcastValueChangeFuncsByHandle[handle];
        if (func) return func;

        this.debouncedBroadcastValueChangeFuncsByHandle[handle] = debounce((payload) => {
            this.broadcastValueChange(payload);
        }, 500);
        return this.debouncedBroadcastValueChangeFuncsByHandle[handle];
    }

    valueHasChanged(handle, newValue) {
        const lastValue = this.lastValues[handle] || null;
        return JSON.stringify(lastValue) !== JSON.stringify(newValue);
    }

    broadcastValueChange(payload) {
        if (this.user.id == payload.user) {
            this.whisper('updated', payload);
        }
    }

    applyBroadcastedValueChange(payload) {
        this.debug('✅ Applying broadcasted value change', payload);
        this.rememberValueChange(payload.handle, payload.value);
        this.container.setFieldValue(payload.handle, payload.value);
    }

    applyBroadcastedMetaChange(payload) {
        this.debug('✅ Applying broadcasted meta change', payload);
        let value = { ...this.lastMetaValues[payload.handle], ...payload.value };
        this.rememberMetaChange(payload.handle, value);
    }

    debug(message, args) {
        console.log('[Collaboration]', message, { ...args });
    }

    isAlone() {
        return this.store.users.length === 1;
    }

    whisper(event, payload) {
        if (this.isAlone()) return;

        const chunkSize = 2500;
        const str = JSON.stringify(payload);
        const msgId = Math.random() + '';

        if (str.length < chunkSize) {
            this.debug(`📣 Broadcasting "${event}"`, payload);
            this.channel.whisper(event, payload);
            return;
        }

        event = `chunked-${event}`;

        for (let i = 0; i * chunkSize < str.length; i++) {
            const chunk = {
                id: msgId,
                index: i,
                chunk: str.substr(i * chunkSize, chunkSize),
                final: chunkSize * (i + 1) >= str.length
            };
            this.debug(`📣 Broadcasting "${event}"`, chunk);
            this.channel.whisper(event, chunk);
        }
    }

    listenForWhisper(event, callback) {
        this.channel.listenForWhisper(event, callback);

        let events = {};
        this.channel.listenForWhisper(`chunked-${event}`, data => {
            if (!events.hasOwnProperty(data.id)) {
                events[data.id] = { chunks: [], receivedFinal: false };
            }

            let e = events[data.id];
            e.chunks[data.index] = data.chunk;
            if (data.final) e.receivedFinal = true;
            if (e.receivedFinal && e.chunks.length === Object.keys(e.chunks).length) {
                callback(JSON.parse(e.chunks.join('')));
                delete events[data.id];
            }
        });
    }

    playAudio(file) {
        let el = document.createElement('audio');
        el.src = this.getViteAudioFile(file);
        document.body.appendChild(el);
        el.volume = 0.25;
        el.addEventListener('ended', () => el.remove());
        el.play();
    }

    getViteAudioFile(file) {
        if (file === 'buddy-in') {
            return buddyIn;
        } else if (file === 'buddy-out') {
            return buddyOut;
        }

        console.error('audio not found');
    }

    initializeValuesAndMeta() {
        this.lastValues = clone(this.container.values.value);
        this.lastMetaValues = {};
    }
}
