<script setup>
import { computed } from 'vue';
import { Icon, Dropdown, DropdownMenu, DropdownItem, Avatar } from '@statamic/cms/ui';

defineEmits(['unlock']);

const props = defineProps({
    channelName: {
        type: String,
        required: true,
    },
});

const useStore = Statamic.$pinia.defineStore(`collaboration/${props.channelName}`, {
    state: () => ({
        users: [],
    }),
});

const store = useStore();

const users = computed(() => store.users);
const connecting = computed(() => store.users.length === 0);
</script>

<template>
    <div class="collaboration-status-bar" :class="{ '-mt-2 mb-2': connecting || users.length > 1 }">
        <div v-if="connecting" class="flex items-center text-sm text-gray-600">
            <Icon name="loading" class="mr-1" />
            {{ __('Attempting websocket connection...') }}
        </div>
        <div v-if="users.length > 1" class="flex items-center">
            <div
                v-for="user in users"
                :key="user.id"
            >
                <Dropdown>
                    <template #trigger>
                        <Avatar
                            :user="user"
                            class="rounded-full w-6 h-6 mr-1 cursor-pointer text-xs"
                        />
                    </template>
                    <DropdownMenu>
                        <DropdownItem :text="__('Unlock')" @click="$emit('unlock', user)" />
                    </DropdownMenu>
                </Dropdown>
            </div>
        </div>
    </div>
</template>
