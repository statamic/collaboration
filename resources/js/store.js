const historyLimit = () => {
    return Statamic.$config.get('collaboration.chat.history_limit') || 100;
};

const storageKey = (channelName) => `collaboration.chat.${channelName}`;
const readKey = (channelName) => `collaboration.chat.${channelName}.lastReadAt`;

function loadFromStorage(channelName) {
    try {
        const raw = localStorage.getItem(storageKey(channelName));
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveToStorage(channelName, messages) {
    try {
        localStorage.setItem(storageKey(channelName), JSON.stringify(messages));
    } catch (e) {
        // Quota exceeded or storage disabled — non-fatal.
    }
}

function loadLastReadAt(channelName) {
    const raw = localStorage.getItem(readKey(channelName));
    return raw ? parseInt(raw, 10) : 0;
}

function saveLastReadAt(channelName, ts) {
    try {
        localStorage.setItem(readKey(channelName), String(ts));
    } catch (e) {
        // non-fatal
    }
}

export function useCollaborationStore(channelName) {
    const useStore = Statamic.$pinia.defineStore(`collaboration/${channelName}`, {
        state: () => ({
            users: [],
            messages: loadFromStorage(channelName),
            lastReadAt: loadLastReadAt(channelName),
        }),
        getters: {
            unreadCount: (state) => state.messages.filter(m => m.ts > state.lastReadAt).length,
        },
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
            addMessage(message) {
                if (this.messages.some(m => m.id === message.id)) return;
                this.messages.push(message);
                const limit = historyLimit();
                if (this.messages.length > limit) {
                    this.messages.splice(0, this.messages.length - limit);
                }
                saveToStorage(channelName, this.messages);
            },
            markRead() {
                this.lastReadAt = Date.now();
                saveLastReadAt(channelName, this.lastReadAt);
            },
            clearMessages() {
                this.messages = [];
                saveToStorage(channelName, this.messages);
            },
        },
    });

    return useStore();
}
