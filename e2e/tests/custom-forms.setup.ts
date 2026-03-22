import { test as setup } from "@playwright/test";
import { createDoc, docExists, getDoc, getList, updateDoc } from "../helpers/frappe";

interface NamedDoc {
	name: string;
}

const testEventRoute = "test-event-e2e";
const testCategoryName = "E2E Test Category";
const testHostName = "E2E Test Host";

// Ensures the E2E test event exists and has custom form toggles enabled.
// Works both standalone and after event.setup.ts.
setup("setup custom forms on test event", async ({ request }) => {
	let eventName: string;

	const events = await getList<NamedDoc>(request, "Buzz Event", {
		filters: { route: ["=", testEventRoute] },
	});

	if (events.length > 0) {
		eventName = events[0].name;
		console.log(`Reusing existing event: ${eventName}`);
	} else {
		if (!(await docExists(request, "Event Category", testCategoryName))) {
			await createDoc(request, "Event Category", {
				name: testCategoryName,
				enabled: 1,
				slug: "e2e-test-category",
			});
		}
		if (!(await docExists(request, "Event Host", testHostName))) {
			await createDoc(request, "Event Host", { name: testHostName });
		}

		const futureDate = new Date();
		futureDate.setMonth(futureDate.getMonth() + 1);
		const startDate = futureDate.toISOString().split("T")[0];

		const event = await createDoc<NamedDoc>(request, "Buzz Event", {
			title: "E2E Test Event",
			category: testCategoryName,
			host: testHostName,
			start_date: startDate,
			route: testEventRoute,
			is_published: 1,
			start_time: "09:00:00",
			end_time: "17:00:00",
			medium: "In Person",
		});
		eventName = event.name;
		console.log(`Created event: ${eventName}`);
	}

	await updateDoc(request, "Buzz Event", eventName, {
		custom_forms: [
			{ doctype: "Buzz Event Form", form_doctype: "Event Feedback", route: "feedback", publish: 1 },
			{ doctype: "Buzz Event Form", form_doctype: "Talk Proposal", route: "propose-talk", publish: 1 },
			{ doctype: "Buzz Event Form", form_doctype: "Sponsorship Enquiry", route: "enquire-sponsorship", publish: 1 },
		],
	});

	const updated = await getDoc<{ custom_forms: Array<{ route: string; publish: number }> }>(
		request, "Buzz Event", eventName,
	);
	const publishedForms = (updated.custom_forms || []).filter((f) => f.publish);
	console.log(`Custom forms enabled on event: ${eventName} (${publishedForms.length} forms: ${publishedForms.map((f) => f.route).join(", ")})`);
});
