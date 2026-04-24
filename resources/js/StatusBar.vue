<script setup>
import { computed, ref, watch, onUnmounted } from 'vue';
import { Icon, Dropdown, DropdownMenu, DropdownItem, Avatar } from '@statamic/cms/ui';
import { useCollaborationStore } from './store';

defineEmits(['unlock']);

const props = defineProps({
    channelName: {
        type: String,
        required: true,
    },
});

const store = useCollaborationStore(props.channelName);
const users = computed(() => store.users);
const connecting = computed(() => store.users.length === 0);
const takingLong = ref(false);
let takingLongTimer = null;

watch(connecting, (isConnecting) => {
    clearTimeout(takingLongTimer);
    if (isConnecting) {
        takingLongTimer = setTimeout(() => takingLong.value = true, 5000);
    } else {
        takingLong.value = false;
    }
}, { immediate: true });

onUnmounted(() => clearTimeout(takingLongTimer));
</script>

<template>
    <div class="collaboration-status-bar relative -top-[1.25rem]" v-if="connecting || users.length > 1">
        <div v-if="connecting" class="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Icon name="loading" class="me-1.5 size-3.5 animate-spin" />
            <template v-if="takingLong">
                {{ __('Connection taking longer than expected. Check the browser console for details.') }}
            </template>
            <template v-else>
                {{ __('Attempting websocket connection...') }}
            </template>
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
    </div>
</template>
