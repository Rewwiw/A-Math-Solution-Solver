# Design & Interface Quality Checklist (Pre-flight QA)
> Sourced from `awesome-design-md` and `Vercel Web Interface Guidelines`.

Whenever creating or modifying frontend UI components, verify the following standards:

1. **Aesthetic & Identity (`taste-skill`)**:
   - Distinctive dark-mode UI with proper contrast, clean borders (`slate-800`), and rounded card surfaces (`rounded-2xl`).
   - No generic AI-purple gradient meshes. Use purposeful semantic colors: Amber for Game Points, Emerald for Wins/Confirm, Rose for Losses/Disputes.

2. **Accessibility & Interaction (`Vercel Guidelines`)**:
   - All interactive elements must be keyboard-operable with clear `:focus-visible` outlines.
   - Touch targets on mobile must be $\ge 44\text{px}$.
   - Modals must have overlay backdrops (`backdrop-blur-sm`), close on Escape/click outside, and apply `overscroll-behavior: contain`.
   - Action buttons must show a loading spinner and preserve label width when performing async actions.

3. **Responsiveness & State Handling**:
   - Tables must have horizontal scroll on mobile (`overflow-x-auto`).
   - Empty states and loading skeletons must be present for all data views.
   - Score difference warnings ($\gt 350$) must be clearly highlighted.
