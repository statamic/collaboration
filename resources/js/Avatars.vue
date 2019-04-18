<template>

    <div class="flex items-center">
        <div
            v-for="user in users"
            :key="user.id"
        >
            <avatar
                :user="user"
                class="mr-1"
            />
            {{ focusedField(user.id) || 'nowhere yet' }}
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
    },

    methods: {

        focusedField(user) {
            return this.$store.state.collaboration[this.channelName].focus[user] || null;
        }

    }

}
</script>
