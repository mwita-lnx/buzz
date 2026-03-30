# Plan: In-App Login Modal

## Status: Implemented ✓

## Goal
Replace the redirect to Frappe's `/login` page with an in-app modal dialog that supports all login features. Users stay on the current page (booking, custom form, etc.) and authenticate without leaving context.

## What Was Done

### New Files Created
1. **`buzz/api/auth.py`** — `get_login_context()` whitelisted API (allow_guest) returning login settings (disable_signup, disable_user_pass_login, login_with_email_link), Google OAuth URL, and login_banner from Buzz Settings
2. **`dashboard/src/components/LoginDialog.vue`** — Multi-view modal with 4 views: login, signup, forgot-password, email-link. Uses native HTML `<form>` validation with `required` attributes. Each view wrapped in `<form @submit.prevent>`. Google OAuth with SVG icon. Banner with localStorage hash persistence.
3. **`dashboard/src/composables/useLoginDialog.ts`** — Shared composable with `open(onSuccess?)` and `close()` to control the modal from anywhere

### Files Modified
1. **`buzz/events/doctype/buzz_settings/buzz_settings.json`** — Added new "Login" tab with `login_banner` Markdown Editor field
2. **`dashboard/src/App.vue`** — Mounted `<LoginDialog />` globally inside `<FrappeUIProvider>`
3. **`dashboard/src/layouts/Layout.vue`** — Added auth gate: shows `<LoginRequired />` instead of page content for non-public routes when user is not logged in
4. **`dashboard/src/components/LoginRequired.vue`** — Changed "Log In" button to open login modal via `useLoginDialog().open()`. Fixed `__()` in `defineProps` default (was causing app crash at module load time before `window.__` was defined)
5. **`dashboard/src/components/Navbar.vue`** — "Log In" button opens login modal instead of redirecting
6. **`dashboard/src/components/BookingForm.vue`** — "Log In" link opens login modal. Submit button shows "Login to Checkout" when user is not logged in and event doesn't allow guest booking. On submit with login required, opens login modal with callback to reload page (form data persisted via `useBookingFormStorage` localStorage)
7. **`dashboard/src/pages/BookTickets.vue`** — Removed `LoginRequired` gate that blocked the entire booking form. Users can now fill in the form and are only prompted to login at checkout time
8. **`dashboard/src/data/session.ts`** — Removed auto-redirect on login success (modal handles post-login flow). Logout now reloads page instead of redirecting to `/login`
9. **`dashboard/src/data/user.ts`** — Removed redirect to `/login` on AuthenticationError
10. **`dashboard/src/router.ts`** — Simplified guard to just fetch user data. Removed redirect to `/login` for unauthenticated users (Layout handles showing LoginRequired). Removed unused `session` import
11. **`dashboard/src/utils/index.ts`** — Removed unused `redirectToLogin()` function

## Key Behaviors

### Booking Flow (non-guest events)
- Form shows fully for all users, even unauthenticated
- Submit button says **"Login to Checkout"** when login is required
- Clicking it opens the login modal on top of the filled form
- After login, page reloads — form data is preserved via `useBookingFormStorage` (localStorage)

### Protected Routes (account, bookings, tickets, etc.)
- Layout shows `LoginRequired` component with "Log In" button
- Button opens login modal instead of redirecting to Frappe's `/login`
- After login, page re-renders with authenticated state

### Login Modal Features
- **Login**: email + password (required, native validation), "Forgot Password?" link
- **Social OAuth**: "Continue with {Provider}" buttons for all enabled Social Login Keys (shown on both login and signup views)
- **Email Link**: "Login with Email Link" button (conditional on system setting)
- **Signup**: full name + email (conditional on disable_signup setting), social login buttons shown here too
- **Forgot Password**: email field, sends reset link
- **Banner**: configurable via Buzz Settings → Login tab, always visible when modal opens (no dismiss/timer logic)

### Form Validation
- All views use `<form @submit.prevent>` with native HTML validation
- Email fields use `type="email"` + `required`
- Password field uses `required`
- Full Name field uses `required` in signup view
- No custom JS validation for empty checks — browser handles it

## Notes

1. **Social login redirect**: OAuth requires a full page redirect to Google. After auth, Frappe redirects back to `/dashboard`. No way around this.
2. **`__()` in defineProps**: Using `__()` in prop defaults causes crashes because it runs at module-load time before the translation plugin installs `window.__`. Fixed by using plain strings for defaults and wrapping with `__()` in the template.
3. **Logout behavior**: Changed from redirecting to `/login` to `window.location.reload()` — the Layout auth gate handles showing LoginRequired after reload.
