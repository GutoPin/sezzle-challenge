# Prompts

The challenge allows any AI tooling and asks for the prompts used. This project
was built in one Claude Code session. The prompts below are copied verbatim,
typos included. The "Clarifications" are my answers to questions the agent
asked while planning.

## 1. Setup question

> tienes la configuracion de agents sincronizados o multiplos agentes disponibles?

(Spanish for "do you have synchronized agents or multiple agents available?")

## 2. The brief

The challenge statement was saved as the agent's project instructions. Then:

> You are senior developer who is doing a challenge to enter to sezzle, i want you to do the app that is detailed in CLAUDE.md, all in english, with i18n, for en/es,
> with all the requirements detailed in the challenge in CLAUDE.md, you have all the skills that is necesary, for go and install some forreact, is important to have a
> clean design ui/ux, have clean and lgible code, anti slop in comments, some natural documentation in .md or in code files and script, with a awesome and fancy page
> with any what the pages need, also is good to do a bit more, use clean architecure, a good file managment, easy setup instalation and run commands, for simplicity
> of others members of sezzle team, use a good brand managment, colors and taste skill for doing a good webpage, this is my ticket to enter so dont mess it up, use
> all the agents you want
>
> use good git version control managment and struct and make the plan for the whole app and their fases

## 3. Clarifications during planning

| Question from the agent                    | Answer                                                                  |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| Go isn't installed. How should it be set up? | Install Go via pacman                                                 |
| Where should the repository live?          | "in the commit only have to be me, not you as coauthor, only me"        |
| Commit the AI skill folders?               | Gitignore them                                                          |
| Which extras beyond the core requirements? | History and keyboard input, light/dark theme, OpenAPI docs, CI          |

## 4. During the build

> done, go installed

> you have been paused by mi conection, continue with the tasks

> i think my conection go bad, continue the task

## How the work was done

The agent wrote a phased plan, which I approved before any code was written.
Each phase was built on its own branch and merged into `main` with `--no-ff`,
so `git log --graph` shows the phases.

| Phase                    | Branch                     | Done by                       |
| ------------------------ | -------------------------- | ----------------------------- |
| Bootstrap                | `main`                     | main agent                    |
| Calculator domain        | `feat/backend-calculator`  | main agent                    |
| REST API                 | `feat/backend-api`         | main agent                    |
| Frontend foundation      | `feat/frontend-foundation` | sub-agent, run in parallel with the backend work |
| Calculator UI            | `feat/frontend-calculator` | main agent                    |
| UI and accessibility pass | `feat/ui-polish`          | sub-agent, run in parallel with Docker and CI |
| Docker and CI            | `chore/docker-ci`          | main agent                    |
| Documentation            | `docs/readme`              | main agent                    |

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
