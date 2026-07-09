import { debug, error } from './logger';

export default class EmptyWorkspace {

    constructor() {
        this.echo = null;
        this.started = false;
        this.channelName = null;
        this.user = Statamic.user;
        this.subscribeTimeout = null;
    }

    start() {
        if (this.started) return;

        this.startChannel();
    }

    startChannel() {
        this.initializeEcho();
    }

    destroy() {
        this.stopChannel();
    }

    stopChannel() {

        if (this.subscribeTimeout) {
            clearTimeout(this.subscribeTimeout);
            this.subscribeTimeout = null;
        }

        if (this.channelName) {
            this.echo.leave(this.channelName);
        }
    }

    initializeEcho() {
        this.channelName = `users.delay`;

        const channelName = this.channelName;
        debug(`Joining channel "${channelName}"`);
        this.channel = this.echo.join(channelName);

        const timeout = setTimeout(() => {
            debug(`⏳ Still waiting to subscribe to "${channelName}" — is your broadcast server running and reachable?`);
            if (this.subscribeTimeout === timeout) this.subscribeTimeout = null;
        }, 5000);
        this.subscribeTimeout = timeout;

        const clearSubscribeTimeout = () => {
            clearTimeout(timeout);
            if (this.subscribeTimeout === timeout) this.subscribeTimeout = null;
        };

        this.channel
            .subscribed(() => {
                clearSubscribeTimeout();
                debug(`✅ Subscribed to channel "${channelName}"`);
            })
            .error(e => {
                clearSubscribeTimeout();
                error(`❌ Subscription error on channel "${channelName}"`, {error: e});
            });
    }
}
