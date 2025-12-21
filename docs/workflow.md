# Development Workflow – CineStream

This document defines the Git, versioning, and collaboration standards for the CineStream project.

---

## Branch Naming Strategy

We use a **feature-per-branch** model aligned with sprints:

| Branch Type       | Naming Pattern             | Example                     | Description |
|-------------------|----------------------------|-----------------------------|-------------|
| **Main**          | `main`                     | —                           | Production-ready code. Protected. |
| **Sprint Base**   | `sprint/<number>`          | `sprint/1`                  | Integration branch for a sprint (optional, see note below) |
| **Feature**       | `feat/<short-description>` | `feat/auth-jwt-login`       | New feature or user story |
| **Fix**           | `fix/<bug-description>`    | `fix/redis-connection-leak` | Bug fixes |
| **Chore**         | `chore/<task>`             | `chore/add-dockerignore`    | Dev tooling, config, docs |
| **Release**       | `release/v0.<sprint>.0`    | `release/v0.1.0`            | Final prep before tagging |

> **Note**:
> We do **not require** `sprint/<n>` branches unless multiple devs work on the same sprint.
> Most teams work directly on feature branches → PR → `main`.
> Sprint versioning is tracked via **tags**, not long-lived branches.

---

## Commit Message Convention

Use **Conventional Commits** format:

```
type(scope): description

[optional body]

[optional footer]
```

### Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Formatting (no logic change)
- `refactor`: Code restructuring
- `test`: Adding or updating tests

### Examples:
```text
feat(auth): implement JWT login endpoint
fix(content): handle TMDB rate limit error
build: add .dockerignore to all services
docs: update README with workflow guide

```

## Versioning Strategy
We follow sprint-based semantic versioning:

v0.<sprint_number>.0

Sprint 0 → v0.0.0 (initial scaffolding)
Sprint 1 → v0.1.0
Sprint 2 → v0.2.0
...
Sprint N → v0.N.0

### When to tag:
At the end of each sprint
After all features are merged to main
After final validation (e.g., docker-compose up works end-to-end)

### How to tag:

git tag -a v0.1.0 -m "Sprint 1: Auth + User Services"
git push origin v0.1.0

## Pull Request (PR) Guidelines
Target branch: main
Title: feat: <description> (matches commit convention)
Description must include:
Related sprint (e.g., "Part of Sprint 1")
List of completed tasks
Screenshots or test results (if UI or logic changed)
Require 1 approval before merge
Delete branch after merge

---
