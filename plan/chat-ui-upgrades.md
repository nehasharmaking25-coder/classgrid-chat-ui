# Chat UI Upgrades

Five features to add to the Classgrid chat UI:

1. **Word-by-word streaming** — stream AI replies from the Groq API (SSE) instead of waiting for the full response.
2. **Copy button on code blocks** — one-click copy for every code block in AI replies.
3. **Delete button for chats** — delete conversations from the sidebar (DELETE endpoint already exists).
4. **Dark/Light mode toggle** — theme switch persisted to localStorage.
5. **Typing indicator** — three-dot indicator while the AI is thinking (already exists; kept during streaming).

## Files touched
- `api/chat.mjs` — stream the Groq response as SSE.
- `app/src/App.jsx` — streaming reader, CodeBlock copy button, delete wiring, theme toggle.
- `app/src/App.css` — code-block copy button, theme toggle, dark-mode variable usage.
- `app/src/index.css` — dark theme variables + semantic color variables.