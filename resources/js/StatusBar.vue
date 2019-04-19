<template>

    <div :class="{ '-mt-2 mb-2': connecting || users.length > 1 }">
        <loading-graphic v-if="connecting" :inline="true" :size="16" text="Attempting websocket connection..." />
        <div v-if="users.length > 1" class="flex items-center">
            <div
                v-for="user in users"
                :key="user.id"
            >
                <avatar
                    :user="user"
                    class="rounded-full w-6 mr-1"
                />
            </div>
        </div>
    </div>

</template>

<script>
export default {

    props: {
        container: {
            required: true,
        },
        channelName: {
            type: String,
            required: true,
        }
    },

    computed: {
        users() {
            return this.$store.state.collaboration[this.channelName].users;
        },
        connecting() {
            return this.users.length === 0;
        }
    }

}
</script>
