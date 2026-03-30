<script setup lang="ts">
import LoginDialog from "@/components/LoginDialog.vue";
import { FrappeUIProvider, setConfig } from "frappe-ui";
import Layout from "./layouts/Layout.vue";

setConfig("systemTimezone", window.timezone?.system || null);
setConfig("localTimezone", window.timezone?.user || null);
</script>

<template>
	<FrappeUIProvider>
		<Layout>
			<router-view />
		</Layout>
		<LoginDialog />
	</FrappeUIProvider>
</template>
