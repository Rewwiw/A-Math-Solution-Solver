---
name: web-interface-guidelines
description: Vercel Web Interface Guidelines for building world-class, accessible, keyboard-operable, and friction-free web interfaces. Use whenever implementing UI components, modals, forms, layout interactions, animations, or keyboard navigation.
---

# Vercel Web Interface Guidelines

Curated from [vercel.com/design/guidelines](https://vercel.com/design/guidelines).
Standards for ergonomics, accessibility, interaction design, and web conventions.

---

## 1. Interactions & Keyboard Navigation

- **Keyboard works everywhere**: Every flow must be keyboard-operable. Follow [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/patterns/).
- **Clear focus (`:focus-visible`)**: Every interactive element shows a visible, high-contrast focus ring (`:focus-visible`). Never remove outline without replacing it with an accessible focus indicator. Use `:focus-within` for grouped controls.
- **Manage focus in overlays**: Trapping focus inside modals/drawers when open, and returning focus to the trigger element when closed.
- **Match visual & hit targets**: Hit targets must be $\ge 24\text{px}$ on desktop, and $\ge 44\text{px}$ on mobile/touch screens.
- **Mobile input size**: Set font size on `<input>` and `<select>` to $\ge 16\text{px}$ on mobile to prevent iOS auto-zoom on focus.
- **Respect browser zoom**: Never disable user zoom with `user-scalable=no`.
- **Don’t block paste**: Never disable paste in `<input>` or `<textarea>`.
- **No dead zones**: If a UI region appears interactive (hover styling, cursor pointer), clicking any part of it must trigger the action.
- **Deep-link everything**: Persist view state, active tabs, filters, and page numbers in URL query parameters whenever feasible.
- **Confirm destructive actions**: Require explicit confirmation or provide an undo snackbar with a 5-second recovery window.
- **Prevent double-tap zoom on controls**: Apply `touch-action: manipulation` on buttons and interactive items.

---

## 2. Forms & Inputs

- **Immediate inline validation**: Validate inputs on blur or with a debounce on change (never abruptly while the user is actively typing).
- **Clear error messages**: Error text must clearly explain *what* went wrong and *how* to fix it. Place error messages directly beneath the corresponding input.
- **Hydration-safe inputs**: Controlled inputs must maintain value and focus without stuttering or losing cursor position across re-renders.
- **Loading buttons**: Show a spinner or progress indicator while preserving the original button label/width to prevent layout shift.
- **Disabled vs Busy**: Avoid setting `disabled` if it prevents users from seeing why a form cannot be submitted; prefer clear validation cues and aria-disabled.

---

## 3. Feedback, State & Performance

- **Optimistic UI Updates**: Update UI immediately upon user action when success is highly probable; roll back with an error notification if the server call fails.
- **Minimum loading duration**: If showing a skeleton or spinner, apply a short threshold (~150ms delay before showing, ~300ms minimum display) to prevent micro-flicker on fast responses.
- **Layout stability (No CLS)**: Always define explicit aspect ratios or dimensions for images, avatars, skeletons, and media containers.
- **Overscroll behavior**: Apply `overscroll-behavior: contain` on modal and drawer dialogs to prevent scroll chaining to the background body.
- **Ellipsis convention**: Menu actions or buttons that open follow-up modals (e.g. "Rename…", "Settings…") and active loading states ("Saving…") should end with an ellipsis.

---

## 4. Animation & Motion

- **Physics-based, purposeful motion**: Use spring or cubic-bezier curves (e.g., `cubic-bezier(0.16, 1, 0.3, 1)`) for natural easing.
- **Respect `prefers-reduced-motion`**: Automatically disable or minimize transforms and transitions when the user prefers reduced motion.
- **Snappy micro-interactions**: Interactive transitions (hover, active, focus) should complete in $100\text{–}200\text{ms}$; modal entries in $200\text{–}300\text{ms}$. Never create sluggish animations that delay productivity.
