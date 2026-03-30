# Plan: Event Proposal Public Form

## Context

Event Proposal DocType exists but is only accessible via the Frappe desk. We want a public-facing form at `/dashboard/event-proposal` that anyone can submit, controlled by a toggle in Buzz Settings.

---

## Changes

### 1. Buzz Settings DocType

**File:** `buzz/events/doctype/buzz_settings/buzz_settings.json`

Add a new **Proposals** Tab Break (before Communications tab) with:

| Field | Type | Notes |
|-------|------|-------|
| `proposals_tab` | Tab Break | Label: "Proposals" |
| `event_proposals_section` | Section Break | Label: "Event Proposals" |
| `accept_event_proposals` | Check | Label: "Accept Event Proposals", default 0 |
| `allow_guest_event_proposals` | Check | Label: "Allow Guest Submission", depends_on: `eval:doc.accept_event_proposals`, default 0 |
| `event_proposal_success_message` | Markdown Editor | depends_on: `eval:doc.accept_event_proposals`, Label: "Success Message" |

### 2. Backend API

**File:** `buzz/api/forms.py`

**2a. Add `EVENT_PROPOSAL_EXCLUDE_FIELDS`**

```python
EVENT_PROPOSAL_EXCLUDE_FIELDS = STANDARD_EXCLUDE_FIELDS | {
    "naming_series",
    "amended_from",
    "host",
}
```

`status` and `submitted_by` are already in `STANDARD_EXCLUDE_FIELDS`.

**2b. `get_event_proposal_form_data()` — whitelist, allow_guest**

- Read `Buzz Settings` — if `accept_event_proposals` is falsy, throw DoesNotExistError
- If guest not allowed and user is Guest, throw AuthenticationError
- Call `get_form_fields("Event Proposal", EVENT_PROPOSAL_EXCLUDE_FIELDS)`
- Read success message from settings
- Return `{form_fields, form_title, success_title, success_message, closed}`

**2c. `submit_event_proposal(data)` — whitelist, allow_guest**

- Same settings + guest check
- Parse data via `frappe.parse_json`
- Build doc from allowed fields only (filter through `get_form_fields`)
- `frappe.get_doc(doc_data).insert(ignore_permissions=True)`

### 3. Frontend Route

**File:** `dashboard/src/router.ts`

Add route:
```typescript
{
    path: "/event-proposal",
    name: "event-proposal",
    meta: { isPublic: true },
    component: () => import("@/pages/EventProposalForm.vue"),
}
```

### 4. New Page: EventProposalForm.vue

**File:** `dashboard/src/pages/EventProposalForm.vue`

Slimmed-down version of BaseCustomEventForm:
- No `eventRoute`/`formRoute` props
- No `EventDetailsHeader`
- No `CustomFieldsSection`
- Calls `get_event_proposal_form_data` on mount
- Submits to `submit_event_proposal`
- Reuses `CustomFieldInput` for field rendering
- Reuses table dialog pattern for Table fields
- Shows success/closed/error states same as BaseCustomEventForm

---

## Files Summary

| File | Action | Change |
|------|--------|--------|
| `buzz/events/doctype/buzz_settings/buzz_settings.json` | Modify | Add Proposals tab with toggle + success message |
| `buzz/api/forms.py` | Modify | Add 2 endpoints + exclude set |
| `dashboard/src/router.ts` | Modify | Add 1 route |
| `dashboard/src/pages/EventProposalForm.vue` | New | Public form page |

## Implementation Order

1. Update Buzz Settings JSON + `bench migrate`
2. Add API endpoints in `buzz/api/forms.py`
3. Add route + create `EventProposalForm.vue`
4. Test end-to-end

## Verification

1. Enable "Accept Event Proposals" in Buzz Settings
2. Navigate to `/dashboard/event-proposal` — form renders with Event Proposal fields (minus status, naming_series, amended_from, host)
3. Submit form — Event Proposal doc created with status "Received"
4. Disable toggle — form shows not found
5. Check success message renders after submission
