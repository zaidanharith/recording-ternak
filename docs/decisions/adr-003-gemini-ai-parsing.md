# ADR-003: Gemini AI for Free-Form Indonesian Text Parsing

## Status
Accepted

## Context
Farmers report livestock events over WhatsApp in casual, unstructured Indonesian (with occasional Javanese mixed in), using varied phrasing, relative dates ("kemarin", "minggu lalu"), and no fixed format. Building a rule-based/regex parser for this input space would be brittle and require constant tuning as new phrasing patterns appear.

## Decision
Use Google's Gemini models for two distinct jobs, kept as separate model instances in `gemini.service.js`:
- `gemini-2.5-flash` (`parserModel`) for structured extraction — parsing report text into the fields listed in `config.dataSchema.aiParseFields`, and classifying intent (revision/cancellation/question) when a farmer replies during `awaiting_confirmation`.
- `gemini-2.5-flash-lite` (`chatModel`, capped at 250 output tokens) for cheap, low-stakes conversational replies (small talk, data questions) where structured extraction isn't needed.

The extraction field list and prompt rules are centralized in `config/index.js`'s `dataSchema.aiParseFields`, not hardcoded in the prompt string, so adding a new reportable field is a config change (see [`backend/coding-standards.md`](../backend/coding-standards.md#central-configuration)).

## Consequences
- Report accuracy depends on Gemini's prompt-following behavior rather than deterministic code — the confirmation step (farmer must reply "ya"/"tidak" to a summary before anything is saved) exists specifically to give the farmer a chance to catch AI misparses before they hit the database.
- API costs and rate limits are a live operational concern; `gemini.service.js` implements `callWithRetry` with exponential backoff specifically tuned for Gemini's RPM (not token quota) rate limiting.
- Splitting parsing (expensive model) from chit-chat (cheap model, capped tokens) keeps cost proportional to how often farmers actually submit reports vs. just chat.
