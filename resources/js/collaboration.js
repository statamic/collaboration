Statamic.$echo.booted(Echo => {

    const id = 'f5c18e4c-4d51-4fc6-ab52-b7afe5116b3a';
    const channel = `entries.${id}`;
    const storeName = 'base';

    Echo.join(channel)
        .here((users) => {
            watchForVuexChanges();
            const names = users.map(user => user.name).join(' ');
            Statamic.$notify.success(`Users here: ${names}`);
        })
        .joining((user) => {
            Statamic.$notify.success(`${user.name} has joined.`);
        })
        .leaving((user) => {
            Statamic.$notify.success(`${user.name} has left.`);
        });

    Echo.private(channel).listenForWhisper('updated', e => {
        applyBroadcastedValueChange(e);
    });

    function watchForVuexChanges() {
        Statamic.$store.subscribe((mutation, state) => {
            if (mutation.type === `publish/${storeName}/setValue`) {
                broadcastValueChange(mutation.payload);
            }
        });
    }

    const broadcastValueChange = _.debounce(function ({ handle, value, user }) {
        // Only my own change events should be broadcasted. Otherwise when other users receive
        // the broadcast, it will be re-broadcasted, and so on, to infinity and beyond.
        if (Statamic.$config.get('userId') != user) return;

        Echo.private(channel)
            .whisper('updated', { handle, value, user });
    }, 500);

    function applyBroadcastedValueChange({ handle, value, user }) {
        Statamic.$store.dispatch(`publish/${storeName}/setValue`, { handle, value, user });
    }

});