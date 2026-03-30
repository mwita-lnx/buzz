import { ref } from "vue"

const is_open = ref(false)
const on_success_callback = ref<(() => void) | null>(null)

export function useLoginDialog() {
	function open(on_success?: () => void) {
		on_success_callback.value = on_success || null
		is_open.value = true
	}

	function close() {
		is_open.value = false
		on_success_callback.value = null
	}

	return { is_open, open, close, on_success_callback }
}
