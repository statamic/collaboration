<template>

    <confirmation-modal
        :open="true"
        :title="__('Refresh Required')"
        :body-text="message"
        :button-text="__('Refresh')"
        :cancellable="false"
        @confirm="emit('confirm')"
    />

</template>

<script setup>
defineProps({
    message: {
        type: String,
        required: true,
    },
});

const emit = defineEmits(['confirm']);
</script>
