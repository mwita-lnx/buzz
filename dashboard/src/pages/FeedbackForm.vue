<template>
	<BaseCustomEventForm
		:event-route="eventRoute"
		form-type="Event Feedback"
		:title="__('Event Feedback')"
		:success-title="__('Thank you for your feedback!')"
		:success-message="__('Your feedback has been submitted successfully.')"
	/>
</template>

<script setup>
import BaseCustomEventForm from "@/components/BaseCustomEventForm.vue"

defineProps({
	eventRoute: { type: String, required: true },
})
</script>
