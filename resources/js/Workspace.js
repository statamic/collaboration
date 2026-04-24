import { watch } from 'vue';
import { debounce } from '@statamic/cms';
import buddyIn from '../audio/buddy-in.wav'
import buddyOut from '../audio/buddy-out.wav'
import { useCollaborationStore } from './store';
import { debug, error } from './logger';

export default class Workspace {

    constructor(container) {
        this.container = container;
        this.echo = null;
        this.started = false;
        this.valuesWatcher = null;
        this.metaWatcher = null;
        this.store = null;
        this.lastValues = {};
        this.lastMetaValues = {};
        this.user = Statamic.user;
        this.initialStateUpdated = false;

        this.debouncedBroadcastValueChangeFuncsByHandle = {};
        this.debouncedBroadcastMetaChangeFuncsByHandle = {};
        this.focusWatcher = null;
        this.containerWatcher = null;
        this.statusBarComponent = null;
        this.subscribeTimeout = null;
    }

    start() {
        if (this.started) return;

        this.initializeHooks();
        this.initializeContainerWatcher();
        this.startChannel();
        this.started = true;
    }

    startChannel() {
        this.initializeEcho();
        this.initializeStore();
        this.initializeValuesAndMeta();
        this.initializeStatusBar();
        this.initializeFocusBlur();
    }

    stopChannel() {
        if (this.valuesWatcher) {
            this.valuesWatcher();
            this.valuesWatcher = null;
        }
        if (this.metaWatcher) {
            this.metaWatcher();
            this.metaWatcher = null;
        }
        if (this.focusWatcher) {
            this.focusWatcher();
            this.focusWatcher = null;
        }
        if (this.subscribeTimeout) {
            clearTimeout(this.subscribeTimeout);
            this.subscribeTimeout = null;
        }
        if (this.statusBarComponent) {
            this.statusBarComponent.destroy();
            this.statusBarComponent = null;
        }
        Object.values(this.debouncedBroadcastValueChangeFuncsByHandle).forEach(f => f.cancel());
        Object.values(this.debouncedBroadcastMetaChangeFuncsByHandle).forEach(f => f.cancel());
        this.debouncedBroadcastValueChangeFuncsByHandle = {};
        this.debouncedBroadcastMetaChangeFuncsByHandle = {};
        if (this.channelName) {
            this.echo.leave(this.channelName);
        }
        this.initialStateUpdated = false;
        this.lastValues = {};
        this.lastMetaValues = {};
    }

    restart() {
        debug('🔄 Site changed — restarting workspace');
        this.stopChannel();
        this.startChannel();
    }

    destroy() {
        this.stopChannel();
        if (this.containerWatcher) {
            this.containerWatcher();
            this.containerWatcher = null;
        }
    }

    initializeContainerWatcher() {
        this.containerWatcher = watch(
            () => [this.container.reference.value, this.container.site.value],
            () => this.restart(),
            { flush: 'sync' },
        );
    }

    initializeEcho() {
        const reference = this.container.reference.value.replaceAll('::', '.');
        this.channelName = `${reference}.${this.container.site.value.replaceAll('.', '_')}`;

        debug(`Joining channel "${this.channelName}"`);
        this.channel = this.echo.join(this.channelName);

        const clearSubscribeTimeout = () => {
            if (this.subscribeTimeout) {
                clearTimeout(this.subscribeTimeout);
                this.subscribeTimeout = null;
            }
        };

        this.subscribeTimeout = setTimeout(() => {
            debug(`⏳ Still waiting to subscribe to "${this.channelName}" — is your broadcast server running and reachable?`);
            this.subscribeTimeout = null;
        }, 5000);

        this.channel
            .subscribed(() => {
                clearSubscribeTimeout();
                debug(`✅ Subscribed to channel "${this.channelName}"`);
            })
            .error(e => {
                clearSubscribeTimeout();
                error(`❌ Subscription error on channel "${this.channelName}"`, {error: e});
            });

        this.channel.here(users => {
            this.initializeValueWatcher();
            this.initializeMetaWatcher();
            this.store.setUsers(users);
        });

        this.channel.joining(user => {
            this.store.addUser(user);
            Statamic.$toast.success(`${user.name} has joined.`);
            this.whisper(`initialize-state-for-${user.id}`, {
                values: this.container.values.value,
                meta: this.cleanEntireMetaPayload(this.container.meta.value),
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
            debug('✅ Applying broadcasted state change', payload);
            this.container.setValues(payload.values);
            this.lastValues = clone(payload.values);
            const restoredMeta = this.restoreEntireMetaPayload(payload.meta || {});
            this.container.setMeta(restoredMeta);
            this.lastMetaValues = clone(restoredMeta);
            Object.entries(payload.focus).forEach(([, { user, handle }]) => this.focus(user, handle));
            this.initialStateUpdated = true;
        });

        this.listenForWhisper('focus', ({ user, handle }) => {
            debug(`Heard that user has changed focus`, { user, handle });
            this.focus(user, handle);
        });

        this.listenForWhisper('blur', ({ user, handle }) => {
            debug(`Heard that user has blurred`, { user, handle });
            this.blur(user, handle);
        });

        this.listenForWhisper('force-unlock', ({ targetUser, originUser }) => {
            debug(`Heard that user has requested another be unlocked`, { targetUser, originUser });

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
            this.destroy(); // Stop listening to anything else.
        });

        this.listenForWhisper('revision-restored', ({ user }) => {
            Statamic.$toast.success(`Revision restored by ${user.name}.`);
            Statamic.$components.append('CollaborationBlockingNotification', {
                props: { message: `Entry has been restored to another revision by ${user.name}` }
            }).on('confirm', () => window.location.reload());
            this.destroy(); // Stop listening to anything else.
        });
    }

    initializeStore() {
        this.store = useCollaborationStore(this.channelName);
    }

    initializeStatusBar() {
        this.statusBarComponent = this.container.pushComponent('CollaborationStatusBar', {
            props: {
                channelName: this.channelName,
            }
        });

        this.statusBarComponent.on('unlock', (targetUser) => {
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
            if (reference === this.container.reference.value) {
                this.whisper('saved', { user: this.user });
            }
            resolve();
        });

        Statamic.$hooks.on('entry.published', (resolve, reject, { reference, message }) => {
            if (reference === this.container.reference.value) {
                this.whisper('published', { user: this.user, message });
            }
            resolve();
        });

        Statamic.$hooks.on('revision.restored', (resolve, reject, { reference }) => {
            if (reference !== this.container.reference.value) return resolve();

            this.whisper('revision-restored', { user: this.user });

            // Echo doesn't give us a promise, so wait half a second before resolving.
            // That should be enough time for the whisper to be sent before the the page refreshes.
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

    initializeMetaWatcher() {
        if (this.metaWatcher || !this.container.meta) return;

        this.metaWatcher = watch(
            this.container.meta,
            (newMeta) => {
                Object.keys(newMeta).forEach(handle => {
                    const newValue = newMeta[handle];
                    if (this.metaHasChanged(handle, newValue)) {
                        this.rememberMetaChange(handle, newValue);
                        this.debouncedBroadcastMetaChangeFuncByHandle(handle)({
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
        debug('Remembering value change', { handle, value });
        this.lastValues[handle] = clone(value);
    }

    rememberMetaChange(handle, value) {
        debug('Remembering meta change', { handle, value });
        this.lastMetaValues[handle] = clone(value);
    }

    debouncedBroadcastValueChangeFuncByHandle(handle) {
        // use existing debounced function if one already exists
        const func = this.debouncedBroadcastValueChangeFuncsByHandle[handle];
        if (func) return func;

        // if the handle has no debounced broadcast function yet, create one and return it
        this.debouncedBroadcastValueChangeFuncsByHandle[handle] = debounce((payload) => {
            this.broadcastValueChange(payload);
        }, 500);
        return this.debouncedBroadcastValueChangeFuncsByHandle[handle];
    }

    debouncedBroadcastMetaChangeFuncByHandle(handle) {
        // use existing debounced function if one already exists
        const func = this.debouncedBroadcastMetaChangeFuncsByHandle[handle];
        if (func) return func;

        // if the handle has no debounced broadcast function yet, create one and return it
        this.debouncedBroadcastMetaChangeFuncsByHandle[handle] = debounce((payload) => {
            this.broadcastMetaChange(payload);
        }, 500);
        return this.debouncedBroadcastMetaChangeFuncsByHandle[handle];
    }

    valueHasChanged(handle, newValue) {
        const lastValue = this.lastValues[handle] || null;
        return JSON.stringify(lastValue) !== JSON.stringify(newValue);
    }

    metaHasChanged(handle, newValue) {
        const lastValue = this.lastMetaValues[handle] || null;
        return JSON.stringify(lastValue) !== JSON.stringify(newValue);
    }

    broadcastValueChange(payload) {
        // Only my own change events should be broadcasted. Otherwise when other users receive
        // the broadcast, it will be re-broadcasted, and so on, to infinity and beyond.
        if (this.user.id == payload.user) {
            this.whisper('updated', payload);
        }
    }

    broadcastMetaChange(payload) {
        // Only my own change events should be broadcasted. Otherwise when other users receive
        // the broadcast, it will be re-broadcasted, and so on, to infinity and beyond.
        if (this.user.id == payload.user) {
            this.whisper('meta-updated', this.cleanMetaPayload(payload));
        }
    }

    // Allow fieldtypes to provide an array of keys that will be broadcasted.
    // For example, in Bard, only the "existing" value in its meta object
    // ever gets updated. We'll just broadcast that, rather than the
    // whole thing, which would be wasted bytes in the message.
    cleanMetaPayload(payload) {
        const allowed = data_get(payload, 'value.__collaboration');
        if (! allowed) return payload;
        let allowedValues = {};
        allowed.forEach(key => allowedValues[key] = payload.value[key]);
        payload.value = allowedValues;
        return payload;
    }

    // Similar to cleanMetaPayload, except for when dealing with the
    // entire list of fields' meta values. Used when a user joins
    // and needs to receive everything in one fell swoop.
    cleanEntireMetaPayload(values) {
        return Object.entries(values).reduce((cleaned, [handle, value]) => {
            cleaned[handle] = this.cleanMetaPayload({ handle, value }).value;
            return cleaned;
        }, {});
    }

    restoreEntireMetaPayload(payload) {
        return Object.entries(payload).reduce((restored, [handle, value]) => {
            restored[handle] = { ...(this.lastMetaValues[handle] || {}), ...value };
            return restored;
        }, {});
    }

    applyBroadcastedValueChange(payload) {
        debug('✅ Applying broadcasted value change', payload);
        this.rememberValueChange(payload.handle, payload.value);
        this.container.setFieldValue(payload.handle, payload.value);
    }

    applyBroadcastedMetaChange(payload) {
        debug('✅ Applying broadcasted meta change', payload);
        let value = { ...this.lastMetaValues[payload.handle], ...payload.value };
        this.rememberMetaChange(payload.handle, value);
        this.container.setFieldMeta(payload.handle, value);
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
            debug(`📣 Broadcasting "${event}"`, payload);
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
            debug(`📣 Broadcasting "${event}"`, chunk);
            this.channel.whisper(event, chunk);
        }
    }

    listenForWhisper(event, callback) {
        this.channel.listenForWhisper(event, callback);

        let events = {};
        this.channel.listenForWhisper(`chunked-${event}`, data => {
            if (! events.hasOwnProperty(data.id)) {
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
        this.lastMetaValues = clone(this.container.meta?.value || {});
    }
}
