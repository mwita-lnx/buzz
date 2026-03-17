<template>
	<BaseCustomEventForm
		:event-route="eventRoute"
		form-type="Talk Proposal"
		:title="__('Propose a Talk')"
		:success-title="__('Proposal Submitted!')"
		:success-message="__('Your talk proposal has been submitted for review.')"
	/>
</template>

<script setup>
import BaseCustomEventForm from "@/components/BaseCustomEventForm.vue"

defineProps({
	eventRoute: { type: String, required: true },
})
</script>
