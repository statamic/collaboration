import { nextTick } from 'vue';
import Manager from './Manager';
import StatusBar from './StatusBar.vue';
import BlockingNotification from './BlockingNotification.vue';

const manager = new Manager;

const originalBoot = Statamic.$components.boot.bind(Statamic.$components);
Statamic.$components.boot = function (app) {
    app.mixin({
        mounted() {
            if (!this.publishContainer || !this.initialReference) return;

            nextTick(() => {
                const container = this.$refs.container;
                if (!container) return;

                manager.addWorkspace({
                    name: this.publishContainer,
                    reference: this.initialReference,
                    site: this.site,
                    container,
                });
            });
        },

        beforeUnmount() {
            if (!this.publishContainer || !this.initialReference) return;
            if (manager.workspaces[this.publishContainer]) {
                manager.destroyWorkspace({ name: this.publishContainer });
            }
        },
    });

    return originalBoot(app);
};

Statamic.booting(() => {
    Statamic.$components.register('CollaborationStatusBar', StatusBar);
    Statamic.$components.register('CollaborationBlockingNotification', BlockingNotification);
});

Statamic.$echo.booted(Echo => {
    manager.echo = Echo;
    manager.boot();
});
