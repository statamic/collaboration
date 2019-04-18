<template>

    <div class="flex items-center">
        <avatar
            v-for="user in users"
            :key="user.id"
            :user="user"
            class="mr-1"
        />
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
        }
    }

}
</script>
