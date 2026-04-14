<template>

    <div class="collaboration-status-bar" :class="{ '-mt-2 mb-2': connecting || users.length > 1 }">
        <div v-if="connecting" class="flex items-center text-sm text-gray-600">
            <ui-icon name="loading" class="mr-1" />
            {{ __('Attempting websocket connection...') }}
        </div>
        <div v-if="users.length > 1" class="flex items-center">
            <div
                v-for="user in users"
                :key="user.id"
            >
                <ui-dropdown>
                    <template #trigger>
                        <ui-avatar
                            :user="user"
                            class="rounded-full w-6 h-6 mr-1 cursor-pointer text-xs"
                        />
                    </template>
                    <ui-dropdown-menu>
                        <ui-dropdown-item :text="__('Unlock')" @click="unlock(user)" />
                    </ui-dropdown-menu>
                </ui-dropdown>
            </div>
        </div>
    </div>

</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    channelName: {
        type: String,
        required: true,
    },
});

const useStore = Statamic.$pinia.defineStore(`collaboration/${props.channelName}`, {
    state: () => ({
        users: [],
        focus: {},
    }),
});

const store = useStore();

const users = computed(() => store.users);
const connecting = computed(() => store.users.length === 0);

function unlock(user) {
    Statamic.$events.$emit(`collaboration.${props.channelName}.unlock`, user);
}
</script>

<style>
    .collaboration-status-bar .dropdown-menu { left: 0; }
</style>
