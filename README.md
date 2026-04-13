# Kolsquare QA Engineering Project

QA report and automated tests for the **Notes feature** of the Kolsquare platform.

**Application under test:** https://kolsquare-qa.fly.dev

---

## CI/CD

Tests run automatically via GitHub Actions on every push and PR to `main`. The workflow:

1. Installs dependencies and Playwright browsers
2. Runs API tests, then UI tests
3. Uploads HTML report and trace artifacts (retained 14 days)

See [`.github/workflows/tests.yml`](.github/workflows/tests.yml) for the pipeline config.

---

## Deliverables

| # | Deliverable | File |
|---|-------------|------|
| 1 | Bug Report | Submitted separately (PDF) |
| 2 | Testing Strategy | [testing-strategy.md](testing-strategy.md) |
| 3 | Future QA Approach | [future-qa-approach.md](future-qa-approach.md) |
| 4 | Automated Test Example (Bonus) | [tests/](tests/) |

---

## Bug Summary

20 issues found (11 UI, 9 API) across 5 severity levels:

| Severity | UI | API | Total |
|----------|-----|-----|-------|
| Critical | 0 | 3 | 3 |
| High | 1 | 2 | 3 |
| Medium | 4 | 1 | 5 |
| Low | 5 | 3 | 8 |
| Info | 1 | 0 | 1 |

---

## Automated Tests

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
npm install
npx playwright install chromium
```

### Running Tests

```bash
# Run all tests
npm test

# API tests only
npm run test:api

# UI/E2E tests only
npm run test:ui

# Open HTML report after a run
npm run test:report
```

### Test Structure

Tests use the **Page Object Model** pattern with custom Playwright fixtures, component objects, and a centralized API client. Known bugs are annotated with `test.fail(true, "Known bug X-XX: description")` so they pass as expected failures and will turn green automatically once fixed.

```
tests/
├── fixtures/
│   └── test-fixtures.ts          # Custom Playwright fixtures (api, notesPage, uid)
├── helpers/
│   ├── api-client.ts             # Centralized REST API client with auto-cleanup
│   └── types.ts                  # TypeScript interfaces (Author, Reply, Note)
├── api/
│   ├── notes-crud.spec.ts        # List, create, edit, delete
│   ├── reply-threading.spec.ts   # Create reply, cascade delete, 404
│   ├── input-validation.spec.ts  # Empty, whitespace, max length
│   └── api-contract.spec.ts      # Schema, status codes, timestamps, ordering
└── ui/
    ├── components/
    │   ├── note-card.component.ts    # NoteCard component (actions + data display assertions)
    │   └── note-modal.component.ts   # NoteModal component (Create, Edit, Reply, Delete dialogs)
    ├── pages/
    │   └── notes.page.ts             # NotesPage POM (composes components)
    ├── note-lifecycle.spec.ts    # Create, edit, delete via UI
    ├── reply-threading.spec.ts   # Add reply, thread collapse/expand
    ├── modal-behavior.spec.ts    # Textarea state reset between operations
    └── data-display.spec.ts      # Author name, avatar, timestamps
```

### Expected Results

Tests that verify **correct behavior** pass. Tests that expose **known bugs** fail — these will turn green once the bugs are fixed.

API tests that fail do so because the application has bugs (missing validation, wrong status codes, etc.). UI tests for known bugs (F-02, A-06) use `test.fail()` so Playwright marks them as **expected failures** (counted as passing).

| Suite | Total | Passing | Expected failures (known bugs) |
|-------|-------|---------|-------------------------------|
| API | 24 | 11 | 13 |
| UI | 9 | 7 | 2 |

---

## Architecture

- **Custom fixtures** — `api` (NotesApiClient), `notesPage` (NotesPage POM), `uid` (unique ID per test for shared-server isolation)
- **Page Object Model** — `NotesPage` composes `NoteModal` and `NoteCard` component objects
- **API client** — Used by both API tests and UI test setup/teardown for data management
- **Unique test data** — Each test generates a unique `uid` to avoid collisions on the shared server

---

## Tools Used

- **Playwright** — E2E and API testing framework
- **TypeScript** — Test language
- **curl** — Manual API exploration during bug discovery
- **Chrome DevTools** — Network inspection and responsive testing
