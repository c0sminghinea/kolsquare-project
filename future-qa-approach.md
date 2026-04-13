# Future QA Approach — Building Quality Engineering at Kolsquare

## 1. Where We Are Today

The Kolsquare platform currently relies on manual testing, with no automated tests, no CI/CD quality gates, and no structured QA process embedded in the development workflow. Manual testing catches issues — but it doesn't scale:

- Regression coverage depends entirely on the tester's time and memory
- Every release requires a full manual pass, slowing delivery cadence
- Developers get feedback late in the cycle, when fixes are most expensive
- Confidence in each release is proportional to how thoroughly someone tested it by hand

The Notes feature QA cycle illustrates this: **20 defects** were found across UI and API layers — including missing server-side validation, incorrect HTTP status codes, and an XSS vulnerability. Most of these would have been caught before code review with the right foundations in place.

This document outlines a practical, phased approach to building a quality engineering practice — from embedding QA into the development process to establishing automated quality gates on every commit.

---

## 2. Guiding Principle: Shift Left

The cost of fixing a defect rises exponentially the later it is discovered:

| Stage where defect is found | Relative cost to fix |
|-----------------------------|---------------------|
| Specification / Design | 1x (a conversation) |
| Development | 5x (code change + re-test) |
| QA / Staging | 10x (bug report, fix, re-deploy, re-test) |
| Production | 50–100x (incident, hotfix, user impact, trust erosion) |

A missing validation rule caught during spec review is a 5-minute conversation. The same issue found in production is an incident, a hotfix, a deployment, and an apology to users.

**Shift left means:**

- QA participates from the first line of the specification, not after the last line of code
- Developers write tests as part of development, not as an afterthought
- Automated checks run on every commit, not once before release
- Quality is a shared responsibility, not one person's bottleneck

---

## 3. Phase 1 — Foundation (Weeks 1–4)

*Objective: Embed QA into the development workflow before writing a single automated test.*

### 3.1 QA in Specification & Planning

Before a ticket enters development, QA reviews it for testability. This catches ambiguity and missing requirements early — when they cost nothing to fix.

**Definition of Ready** — a ticket is ready for development when:

- [ ] Acceptance criteria are defined and testable
- [ ] Edge cases and boundary conditions are identified
- [ ] API contract agreed (endpoints, schemas, status codes, error format)
- [ ] Design reviewed for responsive behavior and accessibility
- [ ] Test approach is clear (what needs unit tests, what needs E2E)

**QA's role in planning:** Ask the questions that prevent bugs.

- *"What happens when the input is empty? Whitespace-only? Over the character limit?"*
- *"What HTTP status code should this return on invalid input?"*
- *"Is this field present in the response when the value is null?"*

For context: 9 of the 20 bugs found in the Notes feature would not have existed if the API contract (status codes, validation rules, response schema) had been agreed upon before development started.

### 3.2 Supporting Developers with Unit Tests

QA does not write unit tests — developers do. QA ensures they exist, they are meaningful, and they cover the right scenarios.

Developers who are not accustomed to writing tests often struggle not with the test framework itself, but with writing **testable code** — separating concerns, injecting dependencies, isolating side effects. This is a skill gap that documentation alone will not close.

**Hands-on enablement (first 2 weeks):**

- **Lunch & Learn sessions** — Weekly 45-minute workshops covering practical topics: "How to unit test a validation function," "Mocking HTTP calls in PHPUnit," "Testing Vue composables with Vitest." Real examples from the Kolsquare codebase, not abstract theory.
- **Pair programming rotations** — QA pairs with each developer for 1–2 sessions to co-write tests on their current feature. The developer writes the code; QA asks "what if the input is empty?" and helps translate that into a test case. This builds muscle memory faster than any guide.
- **Starter templates** — Pre-configured test file templates with common patterns (validation boundary tests, API mock setup, component mount helpers) so developers are not starting from a blank file.

The goal is not to make developers dependent on QA for testing — it is to build their confidence until writing a test feels as natural as writing the implementation.

**What QA provides to developers on an ongoing basis:**

1. **Test scenario specifications** — For each feature, QA delivers concrete scenarios that must be covered at the unit level:

   | Component | Scenarios to Cover |
   |-----------|-------------------|
   | Input validator | Empty rejected, whitespace-only rejected, 255 chars accepted, 256 rejected, trim behavior |
   | Date formatter | ISO to display format, null `updatedAt` hides "Last Edited", timezone handling |
   | User assignment | Returns valid user from pool, user has firstName + lastName + avatar |
   | Thread logic | 2 or fewer replies all visible, more than 2 collapsed with count, expand/collapse toggle |

2. **PR review from a testing perspective** — QA participates in code reviews focusing on test coverage. *"This function handles user input but has no test for whitespace"* is a valid and expected QA comment.

3. **Coverage visibility** — Unit test coverage is tracked per feature area. The target is not 100% — it is meaningful coverage of business logic, validation, and edge cases.

### 3.3 Definition of Done

A feature is complete when:

- [ ] All acceptance criteria verified
- [ ] Unit tests written and passing (developer responsibility)
- [ ] API contract tests passing (if applicable)
- [ ] No open Critical or High severity bugs
- [ ] Responsive behavior and accessibility basics confirmed
- [ ] QA signoff

### 3.4 Test Environment Strategy

| Environment | Purpose | Data Strategy |
|-------------|---------|---------------|
| **Local** | Developer testing, unit tests | Seeded fixtures, reset per run |
| **CI** | Automated suites on every PR | Ephemeral database, torn down after pipeline |
| **Staging** | Integration testing, manual QA | Persistent, periodically reset, namespaced test data |
| **Production** | Live users | Monitored — no direct testing |

**Principle:** Automated tests never depend on shared state. Each test creates its own data, validates, and cleans up. This eliminates flakiness caused by shared environments — a real problem experienced during this testing cycle on the shared staging instance.

**A note on ephemeral databases:** The "reset per run" strategy is ideal but not trivial — especially in legacy systems with complex schemas, migrations, or cross-service dependencies. To avoid this becoming a blocker:

- Align with the infrastructure team **in Week 1**, not when CI is being configured. Database provisioning lead time is usually the longest dependency in pipeline setup.
- Start with a pragmatic alternative if full ephemeral DBs are not ready: use a dedicated CI schema with transactional rollback per test suite, or API-level setup/teardown (as demonstrated in this project's test fixtures).
- Evolve toward true ephemeral instances (Docker containers, cloud-managed test databases) as the infrastructure matures. Do not let perfect be the enemy of good — a working pipeline with transactional cleanup today beats a blocked pipeline waiting for ephemeral infrastructure next quarter.

---

## 4. Phase 2 — Test Automation (Weeks 3–8)

*Objective: Build the automated test suite following the testing pyramid, starting from the most stable and valuable layers.*

### 4.1 The Testing Pyramid

| Layer | Volume | Speed | Ownership | Examples |
|-------|--------|-------|-----------|----------|
| **Unit** (base) | Many (20–50 per feature) | Very fast | Developers | Validation logic, date formatting, thread collapse rules |
| **API / Integration** (middle) | Moderate (15–20 per feature) | Fast | QA | Status codes, response schema, contract validation |
| **E2E** (top) | Few (5–10 per feature) | Slow | QA | Core user journeys through a real browser |

**Target ratio: 70% unit / 20% integration-API / 10% E2E.**

Most teams instinctively start with E2E tests because they feel comprehensive. But E2E tests are slow, fragile, and expensive to maintain. A strong foundation of unit and API tests makes E2E a safety net for critical journeys — not the first line of defense.

### 4.2 Unit Tests (Developer-Owned, QA-Guided)

| Stack | Framework | Owner |
|-------|-----------|-------|
| Backend (PHP) | PHPUnit | Developers |
| Frontend (Vue 3) | Vitest + Vue Test Utils | Developers |

QA does not own unit tests but ensures:

- Coverage targets are met for business logic (at least 80%)
- Validation logic has boundary tests (empty, whitespace, min, max, off-by-one)
- Edge cases from spec review are represented
- Coverage reports are visible in CI, not just locally

### 4.3 API / Integration Tests (QA-Owned)

This is where QA has the highest direct impact. API tests validate the **contract between frontend and backend** — the boundary where most bugs are found.

| Category | What Is Validated |
|----------|-------------------|
| Status codes | 201 for creation, 204 for deletion, 422 for validation errors, 404 for missing resources |
| Response schema | Every field present, correct types, consistent structure across all endpoints |
| Business rules | `updatedAt` changes on edit, cascade delete removes replies, ordering is deterministic |
| Input validation | Empty, whitespace, boundary lengths, special characters, injection |
| Error handling | Meaningful error bodies on 4xx, no raw 500s for user input, no stack traces |

**Framework:** Playwright API testing (TypeScript). Same language and infrastructure as E2E tests. Runs without a browser, executes in seconds.

### 4.4 E2E Tests (QA-Owned)

E2E tests validate **critical user journeys** through a real browser. They are not meant to exhaustively test every edge case — that is what unit and API tests handle.

**Core journeys per feature (5–8 tests):**

1. Create a note and verify it appears in the feed
2. Edit a note and verify updated content and timestamp
3. Delete a note and verify removal and reply cascade
4. Reply to a note and verify reply appears in thread
5. Expand/collapse thread and verify correct replies shown

**Framework:** Playwright (TypeScript) with Page Object Model, component objects, and custom fixtures. The test suite delivered with this project demonstrates this architecture in practice.

### 4.5 Contract Testing

When frontend and backend teams make independent assumptions, those assumptions drift:

| Drift Type | Example from Notes Feature |
|-----------|---------------------------|
| Field naming | Frontend expects `author.name` — backend sends `firstName` + `lastName` |
| Status codes | Frontend expects 422 on validation error — backend returns 200 with error in body |
| Field behavior | Frontend expects `updatedAt` to change on edit — backend never updates it |

**Contract tests catch this before it reaches users:**

| Contract Type | What It Validates |
|--------------|-------------------|
| Request contracts | Backend correctly accepts/rejects the payloads frontend sends |
| Response contracts | Backend response shape matches frontend expectations |
| Error contracts | Error format and status codes are consistent and documented |

Start with Playwright API tests for contract validation. As the system scales to multiple services, evaluate **Pact** for consumer-driven contracts.

**Schema validation at scale:** For a single feature with a handful of endpoints, property-by-property assertions (`toHaveProperty`) are clear and sufficient. As the API grows, adopt a schema validation library like **Zod** to define response schemas declaratively — validating types, optionality, and formats (e.g., ISO 8601 timestamps) in a single parse call instead of dozens of individual assertions. Schema definitions also serve as living documentation of the API contract.

---

## 5. Phase 3 — CI/CD Quality Gates (Weeks 5–10)

*Objective: Every code change is automatically validated before it can be merged or deployed.*

### 5.1 Pipeline Architecture

The pipeline runs through sequential quality gates. Every gate is **blocking** — if tests fail, the pipeline stops. No manual overrides, no "skip tests this one time."

| Stage | What Runs | Blocks Pipeline | Typical Duration |
|-------|-----------|----------------|-----------------|
| 1. Build | Compile, lint, type-check | Yes | ~1 min |
| 2. Unit Tests | PHPUnit + Vitest | Yes | ~2 min |
| 3. API Tests | Playwright API suite | Yes | ~2 min |
| 4. E2E Tests | Playwright browser suite | Yes | ~3 min |
| 5. Deploy | Push to staging/production | Only if all gates pass | ~2 min |

This is the single most impactful practice for preventing regressions.

### 5.2 What Runs When

| Trigger | Unit | API | E2E | Deploy |
|---------|------|-----|-----|--------|
| PR opened / updated | Yes | Yes | — | — |
| Merge to `main` | Yes | Yes | Yes | Staging |
| Nightly schedule | Yes | Yes | Yes (full matrix) | — |
| Release tag | Yes | Yes | Yes | Production |

**Rationale:** E2E tests are slower (~30s+). Running them on every PR push slows developer feedback. Unit + API tests are fast (under 3 min combined) and catch the vast majority of regressions. Full E2E runs on merge and nightly.

### 5.3 Gate Configuration

| Gate | Tool | Threshold | Blocking |
|------|------|-----------|----------|
| Lint and types | ESLint + PHPStan | 0 errors | Yes |
| Unit tests | PHPUnit + Vitest | 100% pass, 80%+ business logic coverage | Yes |
| API tests | Playwright API | 100% pass | Yes |
| E2E tests | Playwright (retries: 2, trace on failure) | 100% pass | Yes |

### 5.4 Failure Protocol

When a gate fails:

1. **Pipeline stops** — no merge, no deployment
2. **Artifacts captured** — Playwright traces, screenshots, and video attached to the failed run
3. **Team notified** — Slack/Teams alert to the engineering channel
4. **Flake policy** — Tests that fail then pass on retry are flagged as flaky. Flaky tests must be fixed within 48 hours — but enforcement alone is not enough. A **quarantine mechanism** ensures flaky tests do not paralyze the team while they are being investigated:

   - **Automatic quarantine** — When a test fails on retry but passes on re-run, CI tags it as flaky and moves it to a separate non-blocking "quarantine" suite. The main pipeline stays green; the quarantine suite runs in parallel and reports separately.
   - **Quarantine dashboard** — Visible to the whole team. Shows quarantined tests, how long they have been quarantined, and who owns the fix. Transparency creates accountability.
   - **48-hour SLA** — Quarantined tests must be diagnosed and either fixed or removed within 48 hours. If the SLA is breached, the test is escalated in standup.
   - **Re-admission** — A fixed test must pass 10 consecutive runs in CI before it is moved back to the main blocking suite. This prevents premature re-admission of still-flaky tests.

   Without quarantine, teams end up in one of two bad states: either the pipeline is permanently red (so everyone ignores it), or flaky tests get deleted (so coverage shrinks). Quarantine is the middle path that preserves both pipeline reliability and test coverage

### 5.5 Reporting and Visibility

| Report | Format | Audience |
|--------|--------|----------|
| PR status check | GitHub Check (pass/fail badge) | Developer on every PR |
| HTML test report | Playwright HTML Reporter | QA + developers (drill into failures) |
| JUnit XML | CI dashboard integration | Engineering leadership |
| Coverage trend | Per-feature breakdown over time | QA + tech leads |

---

## 6. Phase 4 — Maturity (Ongoing)

*Objective: Continuous improvement as the product and team grow.*

### 6.1 Regression Strategy

Every bug fix includes a regression test. The level depends on the bug type:

| Bug Category | Test Level | Example |
|-------------|-----------|---------|
| Missing validation | Unit | Whitespace not rejected — add unit test on validator |
| Wrong status code | API | PATCH returns incorrect code — add API contract test |
| UI state leak | E2E | Modal pre-populated — add lifecycle test |
| Visual drift | Snapshot | Layout shift — add Playwright visual comparison |

**Test impact analysis** — tests tagged by feature area (`@crud`, `@validation`, `@threading`). Source file changes map to tags. PRs run only affected suites; merges and nightly runs execute everything.

### 6.2 Cross-Browser Matrix

Nightly CI runs the E2E suite across browsers:

| Project | Device |
|---------|--------|
| Chromium | Desktop Chrome |
| Firefox | Desktop Firefox |
| WebKit | Desktop Safari |
| Mobile Chrome | Pixel 7 |
| Mobile Safari | iPhone 14 |

Browser-specific issues are prioritized based on user base analytics.

### 6.3 Accessibility Automation

Integrate **axe-core** into the E2E pipeline to catch WCAG violations automatically:

- Automated scans for color contrast, missing labels, focus order, ARIA attributes
- Manual keyboard and screen reader testing for each new feature
- Target: WCAG 2.1 AA compliance across all user-facing pages

### 6.4 Performance Baselines

Lightweight response-time assertions in API tests catch regressions early. Example: assert that `GET /api/notes` responds within 2 seconds. Not a replacement for load testing — but a fast signal when something degrades unexpectedly.

### 6.5 Production Monitoring

Quality assurance extends past deployment:

| Signal | Tool | Action |
|--------|------|--------|
| Unhandled exceptions | Sentry | Alert on new error types; triage within 24h |
| API error rate | Datadog / Grafana | Alert if 5xx rate exceeds threshold |
| Response latency (P95) | APM | Alert if P95 exceeds 2x baseline |
| User error patterns | Analytics | High validation-error rates — revisit UX |

---

## 7. Toolchain

| Purpose | Recommended Tool | Rationale |
|---------|-----------------|-----------|
| E2E + API testing | Playwright (TypeScript) | Single framework for UI and API; fast, reliable, excellent DX |
| Backend unit tests | PHPUnit | Standard for PHP ecosystem (Symfony/Laravel) |
| Frontend unit tests | Vitest + Vue Test Utils | Fast, ESM-native, built for Vue 3 |
| CI/CD | GitHub Actions | Native GitHub integration, matrix builds, artifact management |
| Error monitoring | Sentry | Real-time error tracking with release correlation |
| API documentation | OpenAPI (Swagger) | Single source of truth for contracts |
| Accessibility | axe-core (@axe-core/playwright) | Automated WCAG scanning in the test pipeline |

---

## 8. Roadmap

| Timeframe | Milestone | Outcome |
|-----------|-----------|---------|
| Weeks 1–2 | **Process foundation** | QA embedded in sprint workflow; Definition of Ready/Done established |
| Weeks 2–3 | **Developer enablement** | Unit test guidelines and test scenario specs delivered to dev team |
| Weeks 3–5 | **API test automation** | API contract tests in CI; blocking gate on PRs |
| Weeks 5–7 | **E2E automation** | Core user journeys automated; blocking gate on merge to main |
| Weeks 7–8 | **Full pipeline** | Lint, unit, API, E2E, deploy. Flake detection active |
| Weeks 9–10 | **Nightly regression** | Cross-browser matrix nightly; test trend dashboards visible |
| Ongoing | **Continuous maturity** | Regression coverage grows with every fix; production monitoring active |

---

## 9. Expected Impact

| Metric | Today | After 3 Months |
|--------|-------|----------------|
| Automated test coverage | Manual only | 70%+ of business logic automated |
| Bugs found in production | Unknown (no tracking) | Tracked and trending down |
| Time to detect regressions | Days to weeks (manual) | Minutes (CI pipeline) |
| Release confidence | Low (manual verification) | High (quality gates passed) |
| Developer feedback loop | Wait for QA cycle | Immediate (tests on every PR) |

---

This approach is intentionally phased. Trying to implement everything at once creates friction and resistance. Starting with process (Phase 1) builds trust and demonstrates value before asking the team to change how they write code (Phase 2) or how they deploy (Phase 3). Each phase delivers measurable improvement and lays the foundation for the next.
