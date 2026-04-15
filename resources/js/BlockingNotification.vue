<script setup>
import { ConfirmationModal } from '@statamic/cms/ui';

defineProps({
    message: {
        type: String,
        required: true,
    },
});

defineEmits(['confirm']);
</script>

<template>
  <ConfirmationModal
      open
      :title="__('Refresh Required')"
      :body-text="message"
      :button-text="__('Refresh')"
      :cancellable="false"
      @confirm="$emit('confirm')"
  />
</template>
