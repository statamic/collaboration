<template>

    <modal name="confirmation-modal" :pivotY="0.1" :overflow="false">
        <div class="confirmation-modal flex flex-col h-full">
            <div class="text-lg font-medium p-2 pb-0">
                Refresh Required
            </div>
            <div class="flex-1 px-2 py-3 text-grey">
                {{ message }}
            </div>
            <div class="p-2 bg-grey-20 border-t flex items-center justify-end text-sm">
                <button class="btn btn-primary ml-2" @click="$emit('confirm')">Refresh</button>
            </div>
        </div>
    </modal>

</template>

<script>
export default {

    props: ['message'],

}
</script>
