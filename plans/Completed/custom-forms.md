# Custom Forms Feature - Implementation Plan

## Context

Currently, Talk Proposals and Sponsorship Enquiries use Frappe Web Forms, and Event Feedback has a minimal DocType with no frontend form. We want to replace these with dashboard-based Vue forms using a shared `BaseCustomEventForm.vue` that renders doctype fields + Buzz Custom Fields, with a common success state. This removes the dependency on Frappe Web Forms and gives us full control over UX.

## Architecture

```
Routes:
  /dashboard/events/:eventRoute/feedback         → FeedbackForm.vue
  /dashboard/events/:eventRoute/propose-talk      → ProposeTalkForm.vue
  /dashboard/events/:eventRoute/enquire-sponsorship → EnquireSponsorshipForm.vue

Components:
  FeedbackForm.vue  ──────────┐
  ProposeTalkForm.vue ────────┼──► BaseCustomEventForm.vue
  EnquireSponsorshipForm.vue ─┘         │
                                        ├── CustomFieldInput.vue (reused)
                                        ├── CustomFieldsSection.vue (reused)
                                        └── FormSuccess.vue (new, inline success state)
```

---

## Phase 1: Backend DocType Schema Updates

### 1.1 Update Event Feedback DocType
**File:** `buzz/events/doctype/event_feedback/event_feedback.json`
- Add only `additional_fields` (Table → Additional Field) — keep the DocType minimal for now
- Add permission: `Buzz User` role with `create: 1, read: 1` (if_owner)

### 1.2 Add `additional_fields` to Talk Proposal & Sponsorship Enquiry
**Files:**
- `buzz/proposals/doctype/talk_proposal/talk_proposal.json` — add `additional_fields` (Table → Additional Field)
- `buzz/proposals/doctype/sponsorship_enquiry/sponsorship_enquiry.json` — add `additional_fields` (Table → Additional Field)

Reuses existing `Additional Field` child table (`buzz/ticketing/doctype/additional_field/`).

### 1.3 Update Buzz Custom Field `applied_to` options
**File:** `buzz/buzz/doctype/buzz_custom_field/buzz_custom_field.json`
- Add options: `Event Feedback`, `Talk Proposal`, `Sponsorship Enquiry`

### 1.4 Run `bench migrate`

---

## Phase 2: Backend API Endpoints

**File:** `buzz/api.py`

### 2.1 `get_custom_form_data(event_route, form_type)`
- Whitelist check: `form_type` must be in `CUSTOM_FORM_CONFIG` dict
- Resolve event from `event_route`
- Check deadline (`talk_proposals_close_at`, `sponsorship_proposals_close_at`, none for feedback, show a nice closed message / banner if the form is closed)
- Return `form_fields` (from doctype meta, excluding internal fields like `status`, `submitted_by`, `owner`, `event`), `custom_fields` (Buzz Custom Fields for this event + `applied_to`), `event` details, `closed` flag
- we should also check if event itself is published or not, if not 404

### 2.2 `submit_custom_form(event_route, form_type, data, custom_fields_data)`
- Whitelist check on `form_type`
- Auto-set: `event` from route, `submitted_by` from session user (for Talk Proposal)
- Validate submitted fields against allowed fieldnames
- Create doc, append `additional_fields` rows for custom field values
- Return `{name, doctype}`

Config dict:
```python
CUSTOM_FORM_CONFIG = {
    "Event Feedback": {
        "applied_to": "Event Feedback",
        "exclude_fields": {"name", "owner", "creation", "modified", "modified_by",
                          "docstatus", "idx", "additional_fields", "event"},
        "auto_set": {"event": "from_route"},
        "deadline_field": None,
    },
    "Talk Proposal": {
        "applied_to": "Talk Proposal",
        "exclude_fields": {"name", "owner", "creation", "modified", "modified_by",
                          "docstatus", "idx", "submitted_by", "status",
                          "additional_fields", "event"},
        "auto_set": {"event": "from_route", "submitted_by": "session_user"},
        "deadline_field": "talk_proposals_close_at",
    },
    "Sponsorship Enquiry": {
        "applied_to": "Sponsorship Enquiry",
        "exclude_fields": {"name", "owner", "creation", "modified", "modified_by",
                          "docstatus", "idx", "status", "additional_fields", "event"},
        "auto_set": {"event": "from_route"},
        "deadline_field": "sponsorship_proposals_close_at",
    },
}
```

---

## Phase 3: Frontend

### 3.1 Add routes in `dashboard/src/router.ts`
Three new routes with `props: true`, marked `isPublic` but depending on weather the event has guest booking enabled or not, it should handle that

### 3.2 Create `BaseCustomEventForm.vue`
**File:** `dashboard/src/components/BaseCustomEventForm.vue`

**Props:** `eventRoute`, `formType`, `title`, `successTitle`, `successMessage`

**Behavior:**
1. Fetch form data via `createResource` → `buzz.api.get_custom_form_data`
2. If `closed`, show "submissions closed" message
3. Render standard fields using `CustomFieldInput.vue` (normalized to same shape)
4. Render Buzz Custom Fields via `CustomFieldsSection.vue`
5. Submit via `buzz.api.submit_custom_form`
6. On success, show inline success state (no separate page)

**Special field type handling** (in BaseCustomEventForm, not CustomFieldInput):
- `Text Editor` → frappe-ui `TextEditor`
- `Attach Image` → frappe-ui `FileUploader` (upload first, set URL on doc)
- `Link` → `Autocomplete` with debounced search on linked doctype (check apps/crm on how it renders link field n the CRM frontend, you might also find other types of fields being rendered in the Field.vue of CRM)
- `Table` (e.g. speakers) → List view component showing added rows + "Add" button. Clicking "Add" opens a dialog with the child table's fields. On dialog submit, row is appended. No inline editing — edit button to open the dialog again.

### 3.3 Create wrapper page components
- `dashboard/src/pages/FeedbackForm.vue` — passes `form-type="Event Feedback"`, default success strings
- `dashboard/src/pages/ProposeTalkForm.vue` — passes `form-type="Talk Proposal"`, default success strings
- `dashboard/src/pages/EnquireSponsorshipForm.vue` — passes `form-type="Sponsorship Enquiry"`, default success strings

Each is ~15 lines: just a template with `BaseCustomEventForm` and `defineProps`.
Default success strings are fallbacks — event-level configured messages take priority (see 3.5).

### 3.4 Extend `CustomFieldInput.vue` (if needed)
**File:** `dashboard/src/components/CustomFieldInput.vue`
- May need minor extensions for `Rating` fieldtype
- Complex types (Table) handled directly in `BaseCustomEventForm.vue`
- Text Editor, Attach Image, Link, should be added to custom field input
- in the backend the value column should be changed to `Code` type to support various values like this
- The attachments should be attached to the document being created, the custom field should have the path (check File doctype) to the file

### 3.5 Configurable success messages per event
**DocType change:** Add 3 markdown fields to `Buzz Event` DocType:
- `feedback_success_message` (Markdown)
- `proposal_success_message` (Markdown)
- `sponsorship_success_message` (Markdown)

**API:** `get_custom_form_data` returns the relevant success message field for the form type.
**Frontend:** `BaseCustomEventForm.vue` uses event-configured message if set, otherwise falls back to wrapper's default props.

---

## Files Summary

### New files (6)
| File | Purpose |
|------|---------|
| `dashboard/src/components/BaseCustomEventForm.vue` | Shared form renderer |
| `dashboard/src/pages/FeedbackForm.vue` | Feedback wrapper |
| `dashboard/src/pages/ProposeTalkForm.vue` | Talk proposal wrapper |
| `dashboard/src/pages/EnquireSponsorshipForm.vue` | Sponsorship wrapper |

### Modified files (7)
| File | Change |
|------|--------|
| `buzz/events/doctype/event_feedback/event_feedback.json` | Add additional_fields + permissions |
| `buzz/proposals/doctype/talk_proposal/talk_proposal.json` | Add additional_fields table |
| `buzz/proposals/doctype/sponsorship_enquiry/sponsorship_enquiry.json` | Add additional_fields table |
| `buzz/buzz/doctype/buzz_custom_field/buzz_custom_field.json` | Add 3 new applied_to options |
| `buzz/events/doctype/buzz_event/buzz_event.json` | Add 3 success message markdown fields |
| `buzz/api.py` | Add `get_custom_form_data` + `submit_custom_form` |
| `dashboard/src/router.ts` | Add 3 routes |

---

## Implementation Order
1. DocType schema changes + `bench migrate`
2. API endpoints in `buzz/api.py`
3. `BaseCustomEventForm.vue`
4. Three wrapper pages + router routes
5. Test each form end-to-end

## Verification
- Create a Buzz Event with a route
- Add Buzz Custom Fields for each `applied_to` type
- Navigate to each form URL, verify fields render (standard + custom)
- Submit each form, verify doc created with correct data + additional_fields
- Test deadline enforcement (set `talk_proposals_close_at` to past, verify form shows closed)
- Test without login → should redirect to login page
