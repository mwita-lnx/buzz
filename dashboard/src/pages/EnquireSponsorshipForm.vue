<template>
	<BaseCustomEventForm
		:event-route="eventRoute"
		form-type="Sponsorship Enquiry"
		:title="__('Sponsorship Enquiry')"
		:success-title="__('Enquiry Submitted!')"
		:success-message="__('Your sponsorship enquiry has been submitted. We will be in touch soon.')"
	/>
</template>

<script setup>
import BaseCustomEventForm from "@/components/BaseCustomEventForm.vue"

defineProps({
	eventRoute: { type: String, required: true },
})
</script>
