# Testing Strategy — Kolsquare Notes Feature

## 1. Objective

Evaluate the quality, reliability, and specification compliance of the Notes feature on the Kolsquare platform. This strategy defines the scope, approach, techniques, and coverage for a thorough QA assessment across UI and API layers.

---

## 2. Scope

### In Scope

- Note CRUD operations (Create, Read, Edit, Delete)
- Reply threading (create, collapse/expand, cascade delete)
- Input validation (empty, whitespace, character limits) — frontend and backend
- REST API behavior and compliance
- Modal interactions and state management
- User assignment and data display
- Basic responsive layout and accessibility checks
- XSS and input sanitization

### Out of Scope

- Authentication and authorization (not implemented per specification)
- Performance and load testing
- Database-level testing
- Internationalization / localization

---

## 3. Test Environment

| Attribute | Detail |
|-----------|--------|
| Application URL | https://kolsquare-qa.fly.dev |
| Backend | PHP (Symfony/Laravel), PostgreSQL |
| Frontend | Vue 3 with Reka UI component library |
| Browser | Chromium (primary) |
| API base | `/api` |
| Environment type | Shared staging instance |

**Constraints:**

- Shared server — concurrent users may create or modify data during testing
- No authentication — all data is publicly accessible and mutable
- No data reset mechanism — tests must manage their own data lifecycle

**Test Data Cleanup:** Each test creates data through a centralized `NotesApiClient` that automatically tracks every note ID created during the test. On teardown, a Playwright fixture calls `cleanup()` which iterates the tracked IDs in reverse order and issues `DELETE /api/notes/{id}` for each one. Errors are silently ignored (the note may have already been deleted by the test itself). This is not an `afterAll` hook shared across suites — it is scoped per-test via Playwright's fixture teardown, so each test cleans up only its own data. No test-only headers, no database-level resets, no shared state between tests.

---

## 4. Feature Decomposition

### 4.1 Note CRUD

| Capability | Key Acceptance Criteria |
|-----------|------------------------|
| Create | Modal opens with empty textarea; note appears in feed without page reload |
| Read | Notes listed with author, avatar, and timestamp; consistent ordering |
| Edit | Existing content loads in modal; `updatedAt` reflects the modification |
| Delete | Confirmation dialog shown; note and all replies removed on confirm |

### 4.2 Reply Threading

| Capability | Key Acceptance Criteria |
|-----------|------------------------|
| Create reply | Reply attached to correct parent note |
| Auto-collapse | Threads with more than 2 replies collapse, showing the most recent reply |
| Expand | "Show X more replies" reveals full thread |
| Cascade delete | Deleting a parent removes all its replies |

### 4.3 Input Validation

| Rule | Expected Frontend Behavior | Expected Backend Behavior |
|------|---------------------------|--------------------------|
| Empty content | Submission prevented | 422 Unprocessable Entity |
| Whitespace-only | Submission prevented | 422 Unprocessable Entity |
| Over 255 characters | Counter shown; submission prevented | 422 (not 500) |

### 4.4 Data Display

- `createdAt` shown on all notes and replies
- `updatedAt` ("Last Edited") shown only when a note has been modified
- Author name and avatar displayed correctly
- Notes ordered chronologically (oldest first)

### 4.5 User Assignment

- Random user assigned from a predefined list
- Each user has a unique name and a valid avatar URL

---

## 5. Test Approach

### 5.1 What Is Automated vs. Manual

| Area | Method | Rationale |
|------|--------|-----------|
| API CRUD, schema, status codes | **Automated** | Fast, stable, catches regressions immediately |
| API input validation (empty, whitespace, overflow) | **Automated** | Boundary testing is deterministic and regression-prone |
| UI CRUD lifecycle (create, edit, delete) | **Automated** | Core user journey, high regression risk |
| UI reply threading (add reply, collapse/expand) | **Automated** | Complex state logic, easy to break |
| UI modal behavior (titles, state reset, validation) | **Automated** | State bugs are real and automatable |
| Data display (author name, avatar, timestamps) | **Automated** | If author or "Last Edited" disappears, users notice |
| Input validation (frontend) | **Manual / Unit** | Frontend validation logic belongs to unit/component tests; backend validation is covered by API layer |
| Modal component rendering (titles, button text) | **Manual / Unit** | Component renders correct text — unit test concern, not E2E |
| Accessibility | **Manual** | Automated tools catch only ~30% of real issues; keyboard flow, screen reader, focus trapping require human judgment |
| Visual/design comparison against Figma | **Manual** | Automated visual regression is high-maintenance at this scope |
| Cross-browser and responsive layout | **Manual** | Exploratory pass across viewports; CI matrix added later |
| Exploratory testing (charters) | **Manual** | By definition not scriptable |

### 5.2 API Testing

Direct REST endpoint validation against expected behavior:

| Method | Endpoint | Key Validations |
|--------|----------|-----------------|
| `GET` | `/api/notes` | Returns array with nested replies, correct schema |
| `POST` | `/api/notes` | 201 on success, 422 on invalid input |
| `PATCH` | `/api/notes/{id}` | 200 on success, `updatedAt` changes, 404 on missing ID |
| `DELETE` | `/api/notes/{id}` | 204 on success, cascade deletes replies, 404 on missing ID |
| `POST` | `/api/notes/{id}/reply` | 201 on success, reply attached to correct parent |

**Validation matrix tested across all write endpoints:**

| Input | Expected Response |
|-------|-------------------|
| Valid text | 201 Created / 200 OK |
| Empty string `""` | 422 |
| Whitespace only `"   "` | 422 |
| Over 255 characters | 422 |
| Non-existent resource ID | 404 |

**Schema validation:** Every response verified for correct structure — `id`, `text`, `createdAt`, `updatedAt`, `author` (with `firstName`, `lastName`, `avatar`), and `replies[]` for notes.

### 5.3 UI Testing

E2E tests validate **critical user journeys** through a real browser. They are not meant to exhaustively cover every edge case — that is what API contract tests and unit tests handle.

- **CRUD lifecycle** — Create a note via modal, edit it, delete it; verify feed updates without reload
- **Reply threading** — Add a reply, verify thread collapse with 3+ replies, expand to reveal all
- **Modal state** — Textarea resets between Create operations (cross-interaction state leak — genuinely E2E)
- **Data display** — Author name and avatar visible on note cards, `createdAt` timestamp shown, "Last Edited" label shown after edit

**Visual regression note — thread collapse labels:** The "Show X more replies" button text is dynamically computed from the reply count. Edge cases where the count is exactly 1 or 2 deserve attention: does the label correctly say "Show 1 more reply" (singular) vs. "Show 2 more replies" (plural)? Does it appear at all when exactly 2 replies exist (the collapse threshold)? These label variations are best caught during manual visual review or in a component-level test, since E2E tests verify the expand/collapse interaction but not every permutation of the label text.

**What is deliberately not automated at the E2E level:**

- **Modal titles and button text** — Component rendering belongs to unit/component tests (Vitest + Vue Test Utils)
- **Frontend input validation** — Blocking empty/whitespace submit is component logic; backend validation is covered by 7 API tests
- **Accessibility** — Requires manual keyboard navigation, screen reader testing, and focus flow evaluation

### 5.4 Exploratory Testing

Time-boxed, session-based exploration with targeted charters:

| Charter | Focus | Duration |
|---------|-------|----------|
| Content boundaries | Special characters, unicode, emoji, HTML/script injection, leading/trailing whitespace | 30 min |
| Rapid interactions | Double-click submit, overlapping modals, rapid create-delete cycles | 20 min |
| Concurrency | Two browser tabs, simultaneous create/edit/delete, data consistency | 20 min |
| Error recovery | Network throttling, back button during modal, refresh mid-operation | 20 min |
| Thread edge cases | Reply then delete parent, expand thread then delete reply, 0/1/2/3+ replies behavior | 20 min |

### 5.5 Visual and Design Review

- Layout, spacing, typography, and color compared against Figma specifications
- All user avatars verified (no broken images)
- Modal overlay, close mechanisms (X, Cancel, Escape), and button states
- Hover states on note cards (Edit/Delete visibility and scaling)

### 5.6 Cross-Browser and Responsive

**Browsers:** Chrome (High), Firefox (High), Safari (Medium), Edge (Low)

**Viewports:** 320px, 768px, 1024px, 1440px — layout integrity, modal sizing, textarea behavior, hover interactions.

### 5.7 Accessibility (Manual)

Accessibility testing is performed manually. Automated scanning tools like axe-core catch surface-level violations (contrast, missing labels) but miss the hard problems — keyboard flow, screen reader experience, focus management, and cognitive clarity. A manual pass provides higher confidence.

- **Keyboard navigation** — Tab order reaches all interactive elements; Enter/Space activates; no focus traps outside modals
- **Focus management** — Opening a modal traps focus inside; closing returns focus to trigger; Escape closes
- **Screen reader** — Modal titles announced on open; notes and replies readable in logical order
- **Contrast** — WCAG 2.1 AA (4.5:1 normal text, 3:1 large text)

---

## 6. Entry and Exit Criteria

### Entry Criteria

- [x] Feature deployed to test environment
- [x] Specification and designs available
- [x] API endpoints documented or discoverable

### Exit Criteria

- [x] All planned test scenarios executed
- [x] All defects logged with severity, reproduction steps, expected vs. actual
- [x] No Critical/High bugs left uninvestigated
- [x] Bug report delivered with traceability to specification

---

## 7. Risk Assessment

| Risk | Status | Impact | Mitigation |
|------|--------|--------|------------|
| No server-side input validation | Confirmed | High | Tested all endpoints for empty, whitespace, overflow; bugs logged |
| Shared environment causes test interference | Active | Medium | Unique identifiers per test run; dedicated cleanup |
| No authentication | Confirmed | High | Flagged in bug report; out of scope per spec |
| DB limit (255 chars) without app enforcement | Confirmed | High | Boundary tests at both layers; bugs logged |
| Inconsistent HTTP status codes | Confirmed | Medium | Full status code matrix validated; all deviations reported |
| XSS vulnerability via note content | Confirmed | Critical | Script injection tested during exploratory charter; bug reported |

---

## 8. Defect Summary

Testing identified **20 defects** across 5 severity levels:

| Severity | UI | API | Total |
|----------|-----|-----|-------|
| Critical | 0 | 3 | 3 |
| High | 1 | 2 | 3 |
| Medium | 4 | 1 | 5 |
| Low | 5 | 3 | 8 |
| Info | 1 | 0 | 1 |

**Key systemic issues:**

- **Missing server-side validation** — all write endpoints accept empty, whitespace, and over-length content
- **Non-standard HTTP status codes** — 200 returned where REST conventions require 201, 204, or 422
- **Schema inconsistencies** — fields missing or incorrectly typed in API responses
- **Frontend state management** — modal textarea retains content from previous operations

Full details in the Bug Report (PDF).

---

## 9. Automated Test Suite

As a bonus deliverable, a Playwright test suite was built to validate findings and provide regression coverage:

| Layer | Suite | Tests | Known Bug Annotations |
|-------|-------|-------|-----------------------|
| API / Contract | CRUD | 5 | 1 |
| API / Contract | Reply Threading | 4 | 0 |
| API / Contract | Input Validation | 7 | 6 |
| API / Contract | Schema and Status Codes | 8 | 6 |
| E2E | Note Lifecycle | 3 | 0 |
| E2E | Reply Threading | 2 | 0 |
| E2E | Modal State | 1 | 1 |
| E2E | Data Display | 3 | 1 |
| | **Total** | **33** | **15** |

All 33 tests pass green. Tests covering known bugs use `test.fail()` — they will automatically convert to passing tests once the underlying issues are fixed.

**Tests deliberately omitted from E2E (recommended for unit/component layer):**

- Modal title rendering ("Create a new Note", "Edit Note", "Create a new Reply", "Are you sure you want to delete?")
- Edit modal pre-fills textarea with current content
- Frontend empty/whitespace submit prevention (backend coverage exists in API layer)

Architecture: Page Object Model with custom Playwright fixtures, component objects, and a centralized API client with automatic test data cleanup. See [tests/](tests/) and [README.md](README.md).

---

## 10. CI Quarantine Strategy

Tests that fail intermittently (flaky) or fail due to known, unresolved bugs should not block the CI pipeline for unrelated changes. This section defines how such tests are managed.

### 10.1 Known Bug Tests vs. Quarantined Tests

| Category | Mechanism | Pipeline Impact | Example |
|----------|-----------|-----------------|---------|
| **Known bug** | `test.fail()` | Passes green — no pipeline impact | API returns 200 instead of 201; bug is logged, test expects the failure |
| **Quarantined** | `@quarantine` tag + separate CI project | Excluded from the main pipeline; runs in a parallel reporting job | Flaky UI test that fails 1 in 10 runs due to timing |

`test.fail()` is used when a test reliably demonstrates a known defect — the assertion is inverted, so the test passes today and will start failing (alerting the team) once the bug is fixed. Quarantine is for tests whose failures are **unpredictable** and cannot be addressed immediately.

### 10.2 Quarantine Workflow

1. **Identify** — A test fails intermittently on CI (not reproducible locally, or tied to environment instability).
2. **Tag** — Add `{ tag: '@quarantine' }` to the test and open a tracking ticket with the failure pattern, logs, and frequency.
3. **Isolate** — The main CI pipeline uses `--grep-invert @quarantine` to exclude tagged tests. A separate scheduled job runs quarantined tests and reports results without blocking merges.
4. **Investigate** — Quarantined tests are reviewed weekly. Root causes are identified and fixed (timing issues, shared state, environment flakiness).
5. **Restore** — Once stable for 5 consecutive CI runs, the `@quarantine` tag is removed and the test re-enters the main pipeline.

### 10.3 CI Configuration

The main pipeline rejects quarantined tests:

```yaml
- name: Run API tests
  run: npx playwright test --project=api --grep-invert @quarantine

- name: Run UI tests
  run: npx playwright test --project=ui --grep-invert @quarantine
```

A separate scheduled job monitors quarantined tests:

```yaml
quarantine-report:
  runs-on: ubuntu-latest
  schedule:
    - cron: '0 6 * * 1-5'  # Weekdays at 06:00 UTC
  steps:
    # ... setup steps ...
    - name: Run quarantined tests
      run: npx playwright test --grep @quarantine
      continue-on-error: true

    - name: Upload quarantine report
      uses: actions/upload-artifact@v4
      with:
        name: quarantine-report
        path: playwright-report/
```

### 10.4 Guardrails

- **Maximum quarantine duration:** 2 weeks. If a test cannot be stabilized within that window, it must be either rewritten or permanently removed with a justification in the tracking ticket.
- **Quarantine cap:** No more than 10% of the total test suite may be quarantined at any time. Exceeding this threshold signals a systemic reliability problem that must be addressed before new tests are added.
- **No silent quarantines:** Every quarantined test must have a linked ticket. Untracked quarantines are treated as test gaps during review.

---

## 11. Retry Policy

Playwright retries are configured as the first line of defense against transient failures before quarantining is considered.

### Current Configuration

| Setting | Value | Rationale |
|---------|-------|-----------|
| `retries` | 2 | Tolerates up to 2 transient failures before marking a test as failed |
| `trace` | `on-first-retry` | Captures execution trace on first retry for debugging without storage overhead on every run |
| `screenshot` | `only-on-failure` (UI) | Captures visual state at the point of failure |
| `video` | `on-first-retry` (UI) | Records video on retry to help diagnose timing-dependent UI failures |

### Retry vs. Quarantine Decision Tree

1. Test fails on CI → Playwright retries up to 2 times automatically.
2. Test passes on retry → Counted as **flaky**. Playwright's HTML report flags it. No immediate action, but monitor frequency.
3. Test fails all retries → Marked as **failed**. Pipeline fails.
4. Same test fails intermittently across multiple CI runs → Candidate for **quarantine** (Section 10).

### Flaky Test Monitoring

Tests that pass only on retry are logged by Playwright's built-in flaky detection. A test that appears as flaky in more than 3 CI runs within a week should be investigated — not quarantined immediately, but root-caused. Common causes:

- Animation or rendering timing (→ add `waitFor` or use `toBeVisible` assertions)
- Shared environment data interference (→ improve test isolation)
- Network latency (→ increase specific timeouts, not global ones)

---

## 12. Reporting and Metrics

### CI Artifacts

Every CI run produces three report formats, all uploaded as GitHub Actions artifacts:

| Artifact | Format | Purpose |
|----------|--------|---------|
| `playwright-report/` | HTML | Interactive drill-down: test steps, screenshots, traces, video |
| `test-results/results.xml` | JUnit XML | Machine-readable for CI dashboards, trend tools, and PR status checks |
| `test-results/` | Directory | Raw failure artifacts: screenshots, error context files |

The **Playwright HTML report** is the primary artifact for investigating failures. It includes step-by-step execution, attached traces (on retries), and screenshots/video for UI tests.

### Key Metrics to Track

| Metric | Source | Threshold |
|--------|--------|-----------|
| Pass rate | JUnit XML | ≥ 95% (excluding `test.fail()` known bugs) |
| Flaky rate | Playwright HTML report (flaky flag) | < 5% of total tests per week |
| Execution time | CI job duration | API: < 2 min, UI: < 5 min |
| Quarantine count | Tagged tests | < 10% of suite (Section 10.4) |
| `test.fail()` annotation count | Codebase grep | Reviewed monthly; should trend downward as bugs are fixed |

### Communication

- **Per-run:** GitHub Actions status check on PRs (pass/fail). Developers inspect the HTML report artifact on failure.
- **Weekly:** Quick review of flaky test trends and quarantine status during team standup or async summary.
- **Monthly:** `test.fail()` annotations reviewed — if the underlying bug has been fixed, the test will have started failing (Playwright inverts the expectation), which signals it should be converted to a normal assertion.

---

## 13. Test Maintenance and Ownership

### Ownership Model

| Responsibility | Owner |
|----------------|-------|
| Test suite health (green pipeline, flaky investigation) | QA Engineer |
| Updating tests when feature behavior changes | Developer who makes the change + QA review |
| Quarantine triage and restoration | QA Engineer (weekly) |
| `test.fail()` review and cleanup | QA Engineer (monthly) |

### Maintenance Cadence

| Activity | Frequency | Action |
|----------|-----------|--------|
| `test.fail()` audit | Monthly | Grep for `test.fail()` annotations. Check linked bugs — if fixed, remove annotation and update assertion. If stale (> 3 months, no progress), escalate. |
| Quarantine review | Weekly | Review quarantined tests per Section 10.2. Restore stable ones, rewrite or remove expired ones. |
| Dead test check | Quarterly | Identify tests that no longer map to existing feature behavior. Remove or update. |
| Dependency updates | Monthly | Update Playwright version. Run full suite and verify no new failures from browser engine changes. |

### When Feature Changes

When a product change modifies Notes behavior:

1. Developer updates or removes affected tests as part of the feature PR.
2. QA reviews the PR to ensure coverage is maintained — new behavior has tests, removed behavior has tests deleted.
3. If `test.fail()` tests are affected (the bug they tracked is now "fixed by redesign"), the annotation is removed.

---

## 14. Traceability Matrix

Maps feature requirements (Section 4) to automated test coverage (Section 9) and identifies areas covered only by manual testing.

| Feature Area | Requirement | Automated Coverage | Manual Coverage |
|-------------|-------------|-------------------|-----------------|
| **4.1 Note CRUD** | Create note via modal | `ui/note-lifecycle.spec.ts`, `api/notes-crud.spec.ts` | — |
| | Read notes in feed | `ui/data-display.spec.ts`, `api/notes-crud.spec.ts` | — |
| | Edit note, `updatedAt` updates | `ui/note-lifecycle.spec.ts`, `api/notes-crud.spec.ts` | — |
| | Delete note with confirmation | `ui/note-lifecycle.spec.ts`, `api/notes-crud.spec.ts` | — |
| **4.2 Reply Threading** | Reply attached to parent | `ui/reply-threading.spec.ts`, `api/reply-threading.spec.ts` | — |
| | Auto-collapse > 2 replies | `ui/reply-threading.spec.ts` | — |
| | Expand collapsed thread | `ui/reply-threading.spec.ts` | — |
| | Cascade delete | `api/reply-threading.spec.ts` | — |
| **4.3 Input Validation** | Empty content rejected | `api/input-validation.spec.ts` | Frontend: manual/unit |
| | Whitespace-only rejected | `api/input-validation.spec.ts` | Frontend: manual/unit |
| | Over 255 chars rejected | `api/input-validation.spec.ts` | Frontend: manual/unit |
| **4.4 Data Display** | `createdAt` shown | `ui/data-display.spec.ts` | — |
| | "Last Edited" on modified notes | `ui/data-display.spec.ts` | — |
| | Author name and avatar | `ui/data-display.spec.ts` | — |
| | Chronological ordering | `api/notes-crud.spec.ts` | Visual: manual |
| **4.5 User Assignment** | Random user from predefined list | `api/api-contract.spec.ts` | — |
| | Valid avatar URL | `api/api-contract.spec.ts` | Visual: manual |
| **API Contract** | Correct status codes | `api/api-contract.spec.ts` | — |
| | Response schema consistency | `api/api-contract.spec.ts` | — |
| **Modal Behavior** | State reset between operations | `ui/modal-behavior.spec.ts` | — |
| | Modal titles and button text | — | Manual / unit test |
| **Accessibility** | Keyboard navigation, focus, contrast | — | Manual (Section 5.7) |
| **XSS / Injection** | Script injection sanitized | — | Exploratory (Section 5.4) |
| **Cross-browser** | Firefox, Safari, Edge | — | Manual (Section 5.6) |
| **Responsive** | 320–1440px viewports | — | Manual (Section 5.6) |

**Coverage summary:** 33 automated tests cover all core CRUD, threading, validation, contract, and data display requirements. Accessibility, cross-browser, responsive design, frontend validation, and XSS are covered by manual testing and exploratory charters.
