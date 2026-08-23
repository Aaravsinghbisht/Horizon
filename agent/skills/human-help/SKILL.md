---
name: human-help
description: Pause and ask the human for OTP, captcha, form fields, bot checks, or ambiguous choices — then resume the browser journey without failing.
---

# Human help (browser HITL)

Use eve's built-in `ask_question` tool whenever the browser blocks progress and a human can unblock it in seconds.

## Chat is locked after the first message

The user sends **one** initial task (e.g. "buy black shoes on Amazon under ₹5000"). After that, **chat input is disabled**. You MUST advance the journey only via `ask_question` with **options**. The user clicks option buttons — they cannot type follow-up messages in chat.

**Never finish a turn at a decision point without calling `ask_question`.**

## Mandatory checkpoints (shopping / long journeys)

| Step | What to do |
|------|------------|
| Login / email / password | `activate_tab` → `ask_question` with `FIELDS_JSON:` + `allowFreeform: true` (opens form dialog) |
| Search results loaded | `activate_tab` → `ask_question` listing top 3–5 products as **inline options** |
| User picked a product | Navigate to product page, then `ask_question` to confirm add-to-cart (inline options) |
| Before checkout | `ask_question` with order total in prompt + option **Pay with Compositer Razorpay** (only when site is SAFE) |
| OTP / captcha / 2FA | `activate_tab` → `ask_question` with `allowFreeform: true` (opens dialog) |

## Always ask instead of guessing

- OTP / 2FA / verification codes → **form dialog** (`allowFreeform: true`)
- Login, email, password, address forms → **form dialog** (`FIELDS_JSON:` + `allowFreeform: true`)
- **Which product to buy** after search → inline option buttons only
- **Confirm add to cart / checkout** → inline option buttons only
- Captcha or "verify you are human" → **form dialog** + interactive browser; user may solve in browser or type captcha text in dialog
- Ambiguous UI ("Which account?", "Confirm purchase?") → inline options unless credentials are needed

## Form dialog (`FIELDS_JSON:`)

For login or multi-field forms, include a `FIELDS_JSON:` line in the prompt with field definitions. The UI renders a modal; on submit, values are filled into the browser and returned to you as JSON text.

**Login example**

```json
{
  "prompt": "Enter your login details below. They will be filled into the page for you.\nFIELDS_JSON:[{\"id\":\"email\",\"label\":\"Email\",\"type\":\"email\"},{\"id\":\"password\",\"label\":\"Password\",\"type\":\"password\"}]",
  "allowFreeform": true,
  "options": [
    { "id": "done", "label": "I've logged in — continue" },
    { "id": "blocked", "label": "Still blocked or need help" }
  ]
}
```

After the user submits, parse the JSON from `text`, verify fields were filled with `page_info()`, then continue or submit the form via harness.

**OTP / captcha example**

```json
{
  "prompt": "Enter the verification code from your email or SMS.",
  "allowFreeform": true
}
```

**Browser-first captcha (user solves in panel)**

```json
{
  "prompt": "Complete the captcha in the live browser panel (or type the captcha text below if shown).",
  "allowFreeform": true,
  "options": [
    { "id": "done", "label": "Captcha solved — continue" },
    { "id": "blocked", "label": "Still blocked" }
  ]
}
```

## Search results example (inline options — REQUIRED after every search)

```json
{
  "prompt": "I found these black shoes under ₹5000. Which one should I open?",
  "options": [
    { "id": "p1", "label": "Nike Revolution — ₹3,499" },
    { "id": "p2", "label": "Adidas Runfalcon — ₹2,799" },
    { "id": "p3", "label": "Puma Softride — ₹3,199" },
    { "id": "retry", "label": "None of these — search again" }
  ]
}
```

## Add to cart confirmation (inline options)

```json
{
  "prompt": "Ready to add this item to cart?",
  "options": [
    { "id": "cart", "label": "Yes — add to cart" },
    { "id": "back", "label": "Go back to search results" },
    { "id": "stop", "label": "Stop — don't buy" }
  ]
}
```

## Checkout payment (SAFE sites only)

When the cart is ready and security is SAFE, include the **order total in the prompt** and offer Compositer Razorpay — never send the user to the merchant payment button.

```json
{
  "prompt": "Ready to pay via Compositer — order total ₹4,499. Confirm to open secure Razorpay checkout?",
  "options": [
    { "id": "pay", "label": "Pay with Compositer Razorpay" },
    { "id": "back", "label": "Go back to cart" },
    { "id": "stop", "label": "Cancel purchase" }
  ]
}
```

The UI opens Razorpay automatically when the site is risk-free. After payment succeeds, continue the journey in the same browser session.

## How to ask

- `prompt`: one clear sentence; add `FIELDS_JSON:` on its own line for structured forms
- `options`: use for shopping and yes/no decisions (inline buttons)
- `allowFreeform: true` for OTP, captcha text, and form dialog submissions

After the answer arrives, **continue the same browser session** — do not restart.

## Rules

- Ask early — one short pause beats a failed automation loop.
- **Always `activate_tab` before asking the user to interact with the page.**
- **After search: NEVER proceed without product options (inline, not dialog).**
- Keep the browser tab open while waiting; use `page_info()` after the user responds.
- User may **Take control** in the browser panel anytime; wait for them to return before continuing automation.
