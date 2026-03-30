<template>
	<div>
		<div>
			<Navbar />
		</div>
		<div class="max-w-4xl py-8 px-4 md:py-12 mx-auto">
			<template v-if="requires_auth && !session.isLoggedIn">
				<LoginRequired />
			</template>
			<template v-else>
				<slot></slot>
			</template>
		</div>
	</div>
</template>

<script setup>
import LoginRequired from "@/components/LoginRequired.vue";
import Navbar from "@/components/Navbar.vue";
import { session } from "@/data/session";
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const requires_auth = computed(() => !route.meta?.isPublic);
</script>
