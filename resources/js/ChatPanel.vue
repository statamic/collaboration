<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { Avatar, Button, Icon, Stack, Textarea, StackFooter, StackContent } from '@statamic/cms/ui';

import { useCollaborationStore } from './store';

const props = defineProps({
    channelName: {
        type: String,
        required: true,
    },
});

const emit = defineEmits(['send', 'clear']);

const store = useCollaborationStore(props.channelName);
const messages = computed(() => store.messages);
const unread = computed(() => store.unreadCount);

const open = ref(false);
const draft = ref('');
const scroller = ref(null);
const me = Statamic.user;

watch(open, (isOpen) => {
    if (isOpen) {
        store.markRead();
        nextTick(() => scrollToBottom());
    }
});

watch(
    () => messages.value.length,
    () => {
        if (open.value) {
            store.markRead();
            nextTick(() => scrollToBottom());
        }
    }
);

function scrollToBottom() {
    const el = scroller.value;
    if (el) el.scrollTop = el.scrollHeight;
}

function send() {
    const body = draft.value.trim();
    if (!body) return;
    emit('send', body);
    draft.value = '';
    nextTick(() => scrollToBottom());
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
    emit('clear');
}

function formatTime(ts) {
    try {
        return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch (e) {
        return '';
    }
}

function isMine(msg) {
    return String(msg.user?.id) === String(me.id);
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
            <button
                type="button"
                v-tooltip="__('Chat')"
                class="relative flex size-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100 transition"
            >
                <Icon name="mail-chat-bubble-text" class="size-4" />
                <span
                    v-if="unread > 0"
                    class="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[0.625rem] font-semibold text-white ring-2 ring-content-bg dark:ring-dark-content-bg"
                >
                    {{ unread > 99 ? '99+' : unread }}
                </span>
            </button>
        </template>

        <template #header-actions>
            <Button
                v-if="messages.length"
                icon="trash"
                icon-only
                variant="ghost"
                size="sm"
                v-tooltip="__('Clear chat')"
                @click="clear"
            />
        </template>

        <StackContent>

        <div ref="scroller" class="flex h-full flex-col gap-3 overflow-y-auto px-4 py-3">
            <p v-if="!messages.length" class="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                {{ __('Chats are ephemeral and will be discarded when all users leave this page.') }}
            </p>

            <div
                v-for="msg in messages"
                :key="msg.id"
                class="flex gap-2"
                :class="{ 'flex-row-reverse': isMine(msg) }"
            >
                <Avatar :user="msg.user" class="size-7 shrink-0 text-2xs" />
                <div class="flex min-w-0 flex-1 flex-col" :class="{ 'items-end': isMine(msg) }">
                    <div class="flex items-baseline gap-1.5 text-2xs text-gray-500 dark:text-gray-400">
                        <span class="font-medium text-gray-700 dark:text-gray-300">
                            {{ isMine(msg) ? __('You') : msg.user?.name }}
                        </span>
                        <span>{{ formatTime(msg.ts) }}</span>
                    </div>
                    <div
                        class="mt-0.5 max-w-full whitespace-pre-wrap wrap-break-word rounded-lg px-3 py-1.5 text-sm"
                        :class="isMine(msg)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'"
                    >
                        {{ msg.body }}
                    </div>
                </div>
            </div>
        </div>
        </StackContent>
        <StackFooter class="px-2! py-1!">
            <div class="flex w-full items-center gap-2">
                <Textarea
                    v-model="draft"
                    :rows="1"
                    resize="vertical"
                    :elastic="true"
                    :placeholder="__('Write a message...')"
                    class="flex-1 py-2!"
                    @keydown="onKeydown"
                />
                <Button
                    icon="arrow-right"
                    icon-only
                    variant="primary"
                    :disabled="!draft.trim()"
                    @click="send"
                />
            </div>
        </StackFooter>
    </Stack>
</template>
