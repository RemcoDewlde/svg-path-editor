# Working Agreements

- Prefer minimal, behavior-preserving refactors.
- Avoid reformatting unrelated code when extracting components.
- Keep new files under `src/app/**` for UI and `src/editor/**` for editor logic.
- When extracting from `App.tsx`, start with leaf UI (panels/sidebars) and keep event handlers in `App.tsx`.
