<script setup>
import { computed } from 'vue';
import { Icon, Dropdown, DropdownMenu, DropdownItem, Avatar } from '@statamic/cms/ui';
import { useCollaborationStore } from './store';
import ChatPanel from './ChatPanel.vue';

defineEmits(['unlock', 'chat']);

const props = defineProps({
    channelName: {
        type: String,
        required: true,
    },
});

const store = useCollaborationStore(props.channelName);
const users = computed(() => store.users);
const connecting = computed(() => store.users.length === 0);
const chatEnabled = computed(() => Statamic.$config.get('collaboration.chat.enabled') !== false);
const hasChatHistory = computed(() => store.messages.length > 0);
const showChat = computed(() => chatEnabled.value && !connecting.value && (users.value.length > 1 || hasChatHistory.value));
const visible = computed(() => connecting.value || users.value.length > 1 || showChat.value);
</script>

<template>
    <div class="collaboration-status-bar relative -top-[1.25rem] flex items-center gap-3" v-if="visible">
        <div v-if="connecting" class="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Icon name="loading" class="me-1.5 size-3.5 animate-spin" />
            {{ __('Attempting websocket connection...') }}
        </div>
        <div v-if="users.length > 1" class="flex items-center -space-x-2">
            <Dropdown v-for="(user, index) in users" :key="user.id">
                <template #trigger>
                    <Avatar
                        :user="user"
                        :style="{ zIndex: users.length - index }"
                        v-tooltip="user.name"
                        class="relative size-7 cursor-pointer text-2xs ring-2 ring-content-bg dark:ring-dark-content-bg transition hover:z-20! hover:scale-110 data-[state=open]:z-20! data-[state=open]:scale-110"
                    />
                </template>
                <DropdownMenu>
                    <DropdownItem :text="__('Release field lock')" icon="security-unlock" @click="$emit('unlock', user)" />
                </DropdownMenu>
            </Dropdown>
        </div>
        <ChatPanel
            v-if="showChat"
            :channel-name="channelName"
            @send="body => $emit('chat', body)"
        />
    </div>
</template>
