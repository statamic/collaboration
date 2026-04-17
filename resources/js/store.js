const SCHEMA_VERSION = 1;
const KEY_PREFIX = 'collaboration.chat.';
const READ_SUFFIX = '.lastReadAt';
const KEY_RE = /^collaboration\.chat\.(.+?)(\.lastReadAt)?$/;

const historyLimit = () => {
    return Statamic.$config.get('collaboration.chat.history_limit') || 100;
};

const retentionMs = () => {
    const days = Statamic.$config.get('collaboration.chat.retention_days') ?? 30;
    return days * 24 * 60 * 60 * 1000;
};

const storageKey = (channelName) => `${KEY_PREFIX}${channelName}`;
const readKey = (channelName) => `${KEY_PREFIX}${channelName}${READ_SUFFIX}`;

function loadFromStorage(channelName) {
    try {
        const raw = localStorage.getItem(storageKey(channelName));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (parsed && parsed.v === SCHEMA_VERSION && Array.isArray(parsed.messages)) {
            return parsed.messages;
        }
        // Unknown / legacy shape — drop it rather than risk rendering bad data.
        return [];
    } catch (e) {
        return [];
    }
}

function saveToStorage(channelName, messages) {
    try {
        localStorage.setItem(
            storageKey(channelName),
            JSON.stringify({ v: SCHEMA_VERSION, messages })
        );
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

function pruneStaleChannels(currentChannelName) {
    try {
        const cutoff = Date.now() - retentionMs();
        const channels = {};

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            const match = key.match(KEY_RE);
            if (!match) continue;
            const [, channel, readSuffix] = match;
            if (!channels[channel]) channels[channel] = {};
            if (readSuffix) channels[channel].readKey = key;
            else channels[channel].msgKey = key;
        }

        Object.entries(channels).forEach(([channel, keys]) => {
            if (channel === currentChannelName) return;

            let latestActivity = 0;
            if (keys.readKey) {
                const ts = parseInt(localStorage.getItem(keys.readKey), 10);
                if (!isNaN(ts)) latestActivity = Math.max(latestActivity, ts);
            }
            if (keys.msgKey) {
                try {
                    const parsed = JSON.parse(localStorage.getItem(keys.msgKey));
                    const msgs = parsed && Array.isArray(parsed.messages)
                        ? parsed.messages
                        : Array.isArray(parsed) ? parsed : [];
                    const last = msgs[msgs.length - 1];
                    if (last && typeof last.ts === 'number') {
                        latestActivity = Math.max(latestActivity, last.ts);
                    }
                } catch (e) {
                    // malformed — treat as stale
                }
            }

            if (latestActivity < cutoff) {
                if (keys.readKey) localStorage.removeItem(keys.readKey);
                if (keys.msgKey) localStorage.removeItem(keys.msgKey);
            }
        });
    } catch (e) {
        // non-fatal
    }
}

let hasPruned = false;

export function useCollaborationStore(channelName) {
    if (!hasPruned) {
        pruneStaleChannels(channelName);
        hasPruned = true;
    }

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
