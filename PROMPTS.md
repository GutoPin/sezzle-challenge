# Prompts

The challenge allows any AI tooling and asks for the prompts used. This project
was built with Claude Code in a single session. The prompts below are the ones
that drove each phase, edited into a structured form for readability; their
intent, scope and order match the session.

Each prompt follows the same structure:

- **Role**: who the agent acts as
- **Context**: what already exists and what it can rely on
- **Task**: the outcome expected from this step
- **Constraints**: rules the work must respect
- **Done when**: verifiable acceptance criteria

## 1. Project brief and plan

> **Role:** You are a senior full-stack engineer completing a technical
> challenge for Sezzle.
>
> **Context:** The challenge statement is in `CLAUDE.md`. The stack is a Go REST
> API and a React + TypeScript frontend. Skills for Go, frontend design and
> accessibility are installed and available.
>
> **Task:** Produce a phased implementation plan for the whole application
> before writing any code. Each phase must state its scope, its branch name and
> its acceptance criteria. Wait for my approval of the plan.
>
> **Constraints:**
> - Meet every requirement in the challenge statement, in English, with i18n
>   for English and Spanish.
> - Clean architecture with clear boundaries between domain, transport and UI.
> - Readable code; comments only where they explain intent, never restating
>   the code.
> - A deliberate visual identity: brand colors, typography and a polished,
>   accessible UI/UX.
> - Setup and run commands simple enough for any reviewer on the Sezzle team.
> - Conventional Commits, one branch per phase, merged into `main` with
>   `--no-ff`.
> - Every commit is authored by me only, with no AI co-author trailers.
> - Sub-agents may be used for independent work.
>
> **Done when:** the plan covers every requirement and every phase has
> verifiable acceptance criteria.

### Decisions taken during planning

| Question from the agent                    | Decision                                                      |
| ------------------------------------------ | ------------------------------------------------------------- |
| Go is not installed. How should it be set up? | Install it through the system package manager (pacman)     |
| Should the AI skill folders be committed?  | No, add them to `.gitignore`                                  |
| Which extras beyond the core requirements? | Calculation history, keyboard input, light/dark theme, OpenAPI docs and CI |

## 2. Calculator domain

> **Role:** Senior Go engineer.
>
> **Context:** The approved plan, phase 2. The repository is bootstrapped with a
> Makefile and tooling.
>
> **Task:** Implement the calculator domain as a pure Go package: add,
> subtract, multiply, divide, power, square root and percentage.
>
> **Constraints:** No HTTP or framework types in the domain. Domain errors are
> typed values (division by zero, invalid input, overflow). Floating-point
> results are normalized so that `0.1 + 0.2` returns `0.3`.
>
> **Done when:** table-driven tests cover every operation and every error path,
> and `make lint` and `make test` pass.

## 3. REST API

> **Role:** Senior Go engineer.
>
> **Context:** The domain package from phase 2.
>
> **Task:** Expose the domain over a versioned REST API (`/api/v1`) with an
> OpenAPI 3.1 contract, configuration from environment variables, a health
> check and graceful shutdown.
>
> **Constraints:** One JSON error contract (`code` plus `message`) for every
> failure, with correct HTTP status codes. Strict request decoding: unknown
> fields, wrong arity and non-numeric operands are rejected. CORS restricted to
> configured origins.
>
> **Done when:** handler tests cover success and every error code, and the
> OpenAPI document matches the real responses.

## 4. Frontend foundation (sub-agent, in parallel with phases 2 and 3)

> **Role:** Senior frontend engineer working in a separate git worktree.
>
> **Context:** The API contract in `backend/api/openapi.yaml`. The backend is
> being built in parallel; mock it with MSW.
>
> **Task:** Scaffold the Vite + React + TypeScript app with design tokens,
> Tailwind, i18n (en/es), a theme provider (light, dark, system), a typed API
> client and an accessible app shell.
>
> **Constraints:** Follow the commit rules of the brief. No calculator logic in
> this phase. Browser storage access must never crash the app.
>
> **Done when:** lint, typecheck, tests, coverage thresholds and build all pass.
> The branch is handed back for review before merging.

## 5. Calculator UI

> **Role:** Senior frontend engineer.
>
> **Context:** The merged foundation and the running API.
>
> **Task:** Build the calculator: a state machine for input, a keypad, a
> display, keyboard support and a history tape whose results can be reused.
>
> **Constraints:** Every API error code is translated in both languages.
> Numbers are formatted per locale (`2.5` / `2,5`). Calculator state lives in a
> reducer that is tested without the DOM.
>
> **Done when:** every state transition and error path is tested, and the app
> works end to end against the real API.

## 6. UI and accessibility pass (sub-agent, in parallel with phase 7)

> **Role:** Senior product designer and accessibility reviewer.
>
> **Context:** The working calculator from phase 5.
>
> **Task:** Audit the interface against the web design and accessibility
> guidelines, measure it at several widths from 320px up, and fix what the
> audit finds.
>
> **Constraints:** 44px minimum hit areas, visible focus states, a skip link,
> no horizontal scroll on phones, and both themes checked. Each fix is its own
> commit.
>
> **Done when:** the audit has no open findings and screenshots at each width
> show no layout defects.

## 7. Docker and CI

> **Role:** Senior platform engineer.
>
> **Task:** Package the full stack as a single Docker image that serves the
> frontend, the API and the API docs, and add a CI pipeline that lints, tests
> and builds both layers on every push.
>
> **Constraints:** Multi-stage build, non-root runtime and a health check. One
> command to run it: `make docker-up`.
>
> **Done when:** the image builds, starts and reports healthy, and the CI
> workflow passes.

## 8. Documentation

> **Role:** Senior engineer writing for reviewers who have never seen the
> project.
>
> **Task:** Write the README (setup, API examples, design decisions and
> assumptions), architecture notes with the request flow and the calculator
> state machine, and a generated coverage report.
>
> **Constraints:** Plain, direct prose. Every command and example must be run
> against the real code before it is documented.
>
> **Done when:** a reviewer can clone, run and test the project using only the
> README.

## 9. Input limits

> **Role:** Senior frontend engineer.
>
> **Task:** Cap typed numbers at 15 digits, the most a `float64` stores exactly,
> and remove locale keys that are no longer used.
>
> **Done when:** tests cover the limit in both languages.

## 10. Hardening

> **Role:** Senior QA engineer acting as an adversarial tester.
>
> **Context:** Reviewers will try to break the calculator.
>
> **Task:** Attack the application and fix every defect found. Cover division
> by zero, overflow, malformed and oversized payloads, `null` and non-numeric
> operands, concurrent load and hostile key sequences in the browser.
>
> **Constraints:** Do not add features. Every bug gets a failing test first,
> then the fix.
>
> **Done when:** no input produces a 500, a dropped connection or a wrong value
> on screen.

The pass ran about 50 hostile requests against the API with curl, 5,000
concurrent mixed requests (no 500s, no dropped connections), and drove the real
app in headless Chrome with hostile key sequences. It found two bugs, both
fixed with tests: `null` operands were read as `0`, and a malformed 200
response could have shown `undefined`.

## 11. Resilience documentation

> **Role:** Senior backend engineer.
>
> **Task:** Document the service's resilience limits and its posture against
> abuse and DDoS: what the service enforces itself and what belongs to the
> infrastructure in front of it.
>
> **Done when:** every limit stated in the document is backed by the code or
> by a measured result.

## How the work was done

The agent wrote the phased plan, which I approved before any code was written.
Each phase was built on its own branch and merged into `main` with `--no-ff`,
so `git log --graph` shows the phases.

| Phase                     | Branch                     | Done by                                          |
| ------------------------- | -------------------------- | ------------------------------------------------ |
| Bootstrap                 | `main`                     | main agent                                       |
| Calculator domain         | `feat/backend-calculator`  | main agent                                       |
| REST API                  | `feat/backend-api`         | main agent                                       |
| Frontend foundation       | `feat/frontend-foundation` | sub-agent, in parallel with the backend work     |
| Calculator UI             | `feat/frontend-calculator` | main agent                                       |
| UI and accessibility pass | `feat/ui-polish`           | sub-agent, in parallel with Docker and CI        |
| Docker and CI             | `chore/docker-ci`          | main agent                                       |
| Documentation             | `docs/readme`              | main agent                                       |
| Input limits              | `fix/digit-limit`          | main agent                                       |
| Screenshots               | `docs/screenshots`         | main agent                                       |
| Hardening                 | `fix/hardening`            | main agent                                       |
| Resilience documentation  | `docs/resilience`          | main agent                                       |

Sub-agents worked in separate git worktrees with a written brief: the API
contract, the commit rules and what "done" meant (lint, typecheck, tests,
coverage and build all passing). The main agent reviewed each branch before
merging it.

Skills (reusable instruction packs) used along the way:

- Go: `golang-*` from `samber/cc-skills-golang`
- Art direction: `frontend-design` and `design-taste-frontend`, including the
  latter's browser inspector, which measured the page and took screenshots at
  several widths
- Accessibility and UX audit: `web-design-guidelines`

Every claim in the README was checked against the running code: the curl
examples were run against the real binary, and the Docker image was built and
probed for health.
