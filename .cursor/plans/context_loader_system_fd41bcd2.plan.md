---
name: Context Loader System
overview: Separate system prompt and event context into independent files, create a dynamic loader with timestamp tracking, expose context via backend API, and update the userscript to fetch context dynamically with "last updated" display.
todos:
  - id: create-data-files
    content: Create backend/data/ directory with system-prompt.md, event-context.json, and faqs.json
    status: completed
  - id: create-context-loader
    content: Create backend/context-loader.js with load, getContext, getLastUpdated, reload functions
    status: completed
  - id: update-backend-server
    content: Add /api/context and /api/status endpoints, import context loader
    status: completed
  - id: update-userscript
    content: Fetch context from backend, remove hardcoded prompt, add last updated display
    status: completed
  - id: cleanup
    content: Delete event-context.js and docs/system_prompt.md
    status: completed
---

# Context Loader System

## 1. Create Separate Data Files

Create `backend/data/` directory with three files:

- `system-prompt.md` - AI behavior instructions (tone, safety, grounding rules) - migrated from `docs/system_prompt.md`
- `event-context.json` - Structured event data (dates, venue, policies, logistics)
- `faqs.json` - FAQ entries by category (attendance, general, participation, press, safety)

## 2. Create Context Loader Module

New file: `backend/context-loader.js`

- Load all data files on initialization
- Combine system prompt + event context + FAQs into unified context string
- Track `lastLoaded` timestamp
- Export `getContext()`, `getLastUpdated()`, and `reload()` functions
- Format FAQs as Q&A sections in the context string

## 3. Update Backend Server

Modify `backend/server.js`:

- Import context loader
- Add `GET /api/context` endpoint - returns combined context + lastUpdated timestamp
- Add `GET /api/status` endpoint - returns metadata including lastUpdated
- Remove AI proxy endpoints (no longer needed with BYOK)
- Keep attestation/verification endpoints (still useful for verification UI)

## 4. Update Userscript

Modify `userscript/nearcon-chat.user.js`:

- Add `@connect` grant for backend server
- Fetch context from backend on initialization
- Cache context locally with timestamp
- Replace hardcoded `getSystemPrompt()` (lines 1304-1324) with fetched context
- Add "Last updated X ago" display in header or settings panel
- Add helper function `formatTimeAgo(timestamp)` for human-readable time

## 5. Delete Obsolete Files

- Remove `backend/event-context.js` (replaced by data files + loader)
- Remove `docs/system_prompt.md` (moved to `backend/data/`)