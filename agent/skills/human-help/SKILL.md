---
name: human-help
description: Pause and ask the human for OTP, captcha, form fields, bot checks, or ambiguous choices — then resume the browser journey without failing.
---

# Human help (browser HITL)

Use eve's built-in `ask_question` tool whenever the browser blocks progress and a human can unblock it in seconds.

## Chat is locked after the first message

The user sends **one** initial task (e.g. "buy black shoes on Amazon under ₹5000"). After that, **chat input is disabled**. You MUST advance the journey only via `ask_question` with **options**. The user clicks option buttons — they cannot type follow-up messages.

**Never finish a turn at a decision point without calling `ask_question`.**

## Mandatory checkpoints (shopping / long journeys)

| Step | What to do |
|------|------------|
| Login | `activate_tab` → `ask_question` with "I've logged in — continue" |
| Search results loaded | `activate_tab` → `ask_question` listing top 3–5 products as options |
| User picked a product | Navigate to product page, then `ask_question` to confirm add-to-cart |
| Before checkout | `ask_question` to confirm purchase or go back |

## Always ask instead of guessing

- OTP / 2FA / verification codes (only case for `allowFreeform: true`)
- Login pages and forms the user must fill manually
- **Which product to buy** after search
- **Confirm add to cart / checkout**
- Captcha or "verify you are human" challenges
- Ambiguous UI ("Which account?", "Confirm purchase?")

## Manual browser interaction (login, forms, captchas)

When the user must click or type in the page (login, checkout, captcha):

1. Navigate to the page and call **`activate_tab(target)`**
2. Call `ask_question` with options — user interacts in the browser panel, then picks an option in chat
3. After the answer, verify with `page_info()` before continuing

**Login example**

```json
{
  "prompt": "Please log in using the live browser panel on the right. When done, pick an option below.",
  "options": [
    { "id": "done", "label": "I've logged in — continue" },
    { "id": "blocked", "label": "Still blocked or need help" }
  ]
}
```

**Search results example (REQUIRED after every search)**

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

**Add to cart confirmation**

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

## How to ask

- `prompt`: one clear sentence
- `options`: **always** provide options for decisions (shopping, login done, captcha solved)
- `allowFreeform: true` **only** for OTP / verification codes

After the answer arrives, **continue the same browser session** — do not restart.

## Rules

- Ask early — one short pause beats a failed automation loop.
- **Always `activate_tab` before asking the user to interact with the page.**
- **After search: NEVER proceed without product options.**
- Keep the browser tab open while waiting; use `page_info()` after the user responds.
