<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { Avatar, Button, Icon, Stack, Textarea, StackFooter, StackContent, Badge } from '@statamic/cms/ui';

import { useCollaborationStore } from './store';

const props = defineProps({
    channelName: {
        type: String,
        required: true,
    },
});

const emit = defineEmits(['send']);

const store = useCollaborationStore(props.channelName);
const messages = computed(() => store.messages);
const unread = computed(() => store.unreadCount);
const isAlone = computed(() => store.users.length <= 1);
const presentUsersById = computed(() => {
    const map = {};
    store.users.forEach(u => { map[String(u.id)] = u; });
    if (Statamic.user) map[String(Statamic.user.id)] = { ...map[String(Statamic.user.id)], ...Statamic.user };
    return map;
});

function userFor(msg) {
    return presentUsersById.value[String(msg.user?.id)] || msg.user || {};
}

const open = ref(false);
const draft = ref('');
const scroller = ref(null);
const lastSeenLength = ref(messages.value.length);
const newMessagesBelow = ref(0);
const me = Statamic.user;

watch(open, (isOpen) => {
    if (isOpen) {
        store.markRead();
        nextTick(() => {
            scrollToBottom();
            lastSeenLength.value = messages.value.length;
            newMessagesBelow.value = 0;
        });
    }
});

watch(
    () => messages.value.length,
    (newLen) => {
        if (!open.value) return;
        const wasAtBottom = isNearBottom();
        nextTick(() => {
            if (wasAtBottom) {
                scrollToBottom();
                store.markRead();
                lastSeenLength.value = newLen;
                newMessagesBelow.value = 0;
            } else {
                newMessagesBelow.value = Math.max(0, newLen - lastSeenLength.value);
            }
        });
    }
);

function isNearBottom(threshold = 40) {
    const el = scroller.value;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
}

function scrollToBottom() {
    const el = scroller.value;
    if (el) el.scrollTop = el.scrollHeight;
}

function onScroll() {
    if (isNearBottom()) {
        newMessagesBelow.value = 0;
        lastSeenLength.value = messages.value.length;
        if (open.value) store.markRead();
    }
}

function jumpToLatest() {
    scrollToBottom();
    newMessagesBelow.value = 0;
    lastSeenLength.value = messages.value.length;
    store.markRead();
}

function send() {
    const body = draft.value.trim();
    if (!body || isAlone.value) return;
    emit('send', body);
    draft.value = '';
    nextTick(() => {
        scrollToBottom();
        lastSeenLength.value = messages.value.length;
        newMessagesBelow.value = 0;
    });
}

function onKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
    }
}

function clear() {
    if (!confirm(__('Clear chat history on this device?'))) return;
    store.clearMessages();
}

function formatTime(ts) {
    try {
        return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch (e) {
        return '';
    }
}

function formatFullTime(ts) {
    try {
        return new Date(ts).toLocaleString();
    } catch (e) {
        return '';
    }
}

function isMine(msg) {
    return String(msg.user?.id) === String(me.id);
}

const NAME_COLORS = [
    'text-blue-600 dark:text-blue-400',
    'text-violet-600 dark:text-violet-400',
    'text-pink-600 dark:text-pink-400',
    'text-emerald-600 dark:text-emerald-400',
    'text-amber-600 dark:text-amber-400',
    'text-cyan-600 dark:text-cyan-400',
    'text-rose-600 dark:text-rose-400',
    'text-teal-600 dark:text-teal-400',
];

function nameColor(id) {
    if (!id) return NAME_COLORS[0];
    const s = String(id);
    let hash = 0;
    for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
    return NAME_COLORS[Math.abs(hash) % NAME_COLORS.length];
}

const GROUP_WINDOW_MS = 3 * 60 * 1000;
const TIME_WINDOW_MS = 2 * 60 * 1000;

function startsGroup(index) {
    if (index === 0) return true;
    const curr = messages.value[index];
    const prev = messages.value[index - 1];
    if (!prev || !curr) return true;
    if (String(prev.user?.id) !== String(curr.user?.id)) return true;
    return (curr.ts - prev.ts) > GROUP_WINDOW_MS;
}

function showTime(index) {
    if (index === 0) return true;
    const curr = messages.value[index];
    const prev = messages.value[index - 1];
    if (!prev || !curr) return true;
    if (String(prev.user?.id) !== String(curr.user?.id)) return true;
    return (curr.ts - prev.ts) > TIME_WINDOW_MS;
}
</script>

<template>
    <Stack
        v-model:open="open"
        :title="__('Chat')"
        icon="mail-chat-bubble-text"
        size="narrow"
        show-close-button
        inset
    >
        <template #trigger>
            <Button
                icon="mail-chat-bubble-text"
                size="sm"
                variant="filled"
                class="relative"
                :class="unread > 0 ? 'pe-4!' : ''"
            >
                {{ __('Chat') }}
                <Badge v-if="unread > 0" color="white" pill size="sm" class="ms-2 absolute -right-2 -top-0.5">
                    {{ unread > 99 ? '99+' : unread }}
                </Badge>
            </Button>
        </template>

        <template #header-actions>
            <Button
                v-if="messages.length"
                icon="trash"
                icon-only
                inset
                variant="ghost"
                v-tooltip="__('Clear chat')"
                @click="clear"
            />
        </template>

        <StackContent class="p-2!">

        <div class="relative h-full">
        <div ref="scroller" class="flex h-full flex-col gap-1.5 overflow-y-auto" @scroll.passive="onScroll">
            <p v-if="!messages.length" class="py-6 px-3 text-center text-sm text-gray-500 dark:text-gray-400">
                {{ __('Messages are stored only on your device. New users joining the chat won\'t see earlier messages.') }}
            </p>

            <div
                v-for="(msg, index) in messages"
                :key="msg.id"
                class="flex items-start gap-2"
                :class="[
                    isMine(msg) ? 'flex-row-reverse' : '',
                    startsGroup(index) ? 'mt-3 first:mt-0' : 'm-0',
                ]"
            >
                <Avatar
                    v-if="startsGroup(index)"
                    :user="userFor(msg)"
                    class="size-7 shrink-0 text-2xs outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
                />
                <div v-else class="size-7 shrink-0" aria-hidden="true" />

                <div
                    class="w-fit max-w-[85%] whitespace-pre-wrap wrap-break-word rounded-2xl px-3 py-1.5 text-sm"
                    :class="[
                        isMine(msg)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100',
                        startsGroup(index)
                            ? (isMine(msg) ? 'rounded-te-sm' : 'rounded-ts-sm')
                            : '',
                    ]"
                >
                    <div
                        v-if="startsGroup(index) && !isMine(msg)"
                        class="text-2xs font-semibold"
                        :class="nameColor(msg.user?.id)"
                    >
                        {{ userFor(msg).name }}
                    </div>
                    <div>{{ msg.body }}<time
                            v-if="showTime(index)"
                            :datetime="new Date(msg.ts).toISOString()"
                            :title="formatFullTime(msg.ts)"
                            class="ms-2 inline-block translate-y-px tabular-nums text-2xs"
                            :class="isMine(msg) ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'"
                        >{{ formatTime(msg.ts) }}</time></div>
                </div>
            </div>
        </div>
        <button
            v-if="newMessagesBelow > 0"
            type="button"
            class="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-blue-500 px-3 py-1 text-xs font-medium text-white shadow-md hover:bg-blue-600"
            @click="jumpToLatest"
        >
            <Icon name="arrow-down" class="size-3" />
            {{ newMessagesBelow > 99 ? '99+' : newMessagesBelow }} {{ newMessagesBelow === 1 ? __('new message') : __('new messages') }}
        </button>
        </div>
        </StackContent>
        <StackFooter class="px-2! py-1!">
            <div class="flex w-full flex-col gap-1">
                <p v-if="isAlone" class="px-1 pt-2 text-2xs text-gray-500 dark:text-gray-400">
                    {{ __("Chat is disabled. You're the only one here.") }}
                </p>
                <div class="flex w-full items-center gap-2">
                    <Textarea
                        v-model="draft"
                        :rows="1"
                        resize="vertical"
                        :elastic="true"
                        :placeholder="isAlone ? __('Waiting for someone to join...') : __('Write a message...')"
                        :disabled="isAlone"
                        class="flex-1 py-2!"
                        @keydown="onKeydown"
                    />
                    <Button
                        icon="arrow-right"
                        icon-only
                        variant="primary"
                        :disabled="!draft.trim() || isAlone"
                        @click="send"
                    />
                </div>
            </div>
        </StackFooter>
    </Stack>
</template>
