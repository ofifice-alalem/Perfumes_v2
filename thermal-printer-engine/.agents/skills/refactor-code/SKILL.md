---
name: refactor-code
description: |
  Intelligently refactors code to improve quality, maintainability, performance, and readability while strictly preserving existing behavior.
  Establishes test baselines, writes characterization tests if missing, performs incremental refactoring steps, applies Laravel/PHP & framework-specific optimizations, and executes static analysis and verification before finishing.
metadata:
  version: v1
  publisher: local
---

# Refactor Code Skill

## Purpose
Intelligently refactor and improve code quality while strictly preserving existing behavior.
Refactoring improves internal structure without altering external behavior.

Always prioritize:
- Safety over speed
- Test-driven verification
- Behavior preservation
- Small, incremental edits
- Clean code principles

---

# Workflow Phases

## Phase 1 — Pre-Refactoring Analysis
1. Identify the target code that requires refactoring and the exact reasons why (complexity, duplication, poor testability, coupling, readability).
2. Completely understand existing functionality, input/output contracts, edge cases, and side effects.
3. Review existing tests, docstrings, and consumer usage points across the repository using `grep_search` and `view_file`.

## Phase 2 — Characterization Tests
If test coverage for the target code is incomplete or missing:
- Write **characterization tests** BEFORE making any structural edits.
- Characterization tests describe the **current actual behavior** of the system, including edge cases and existing bugs (if any), to prevent unintentional regressions.
- Capture:
  - Valid and invalid inputs
  - Boundary values and empty states
  - Exceptions and error handling
  - Authorization & database interactions
  - External service failures

## Phase 3 — Baseline Establishment
- Run relevant test suites before editing any code.
- Detect project testing frameworks:
  - **Laravel/PHP**: `php artisan test`, `vendor/bin/phpunit`, or `vendor/bin/pest`.
  - **Node.js/TS**: `npm test`, `npx jest`, `npx vitest`.
  - **Python**: `pytest`, `python -m unittest`.
- Record baseline test results: passed/failed count, warnings, linting/static analysis status.
- If baseline tests are already failing, clearly separate **pre-existing failures** from **refactoring regressions**.

## Phase 4 — Refactoring Strategy
Define target goals before making code changes:
- **Goals**: Reduce complexity, improve readability, eliminate duplication (DRY), improve separation of concerns, reduce coupling, enhance performance, improve error handling.
- **Select smallest suitable refactoring operations**:
  - *Extract Method / Function*: Move logical blocks into cohesive helper methods.
  - *Extract Class / Service / Action*: Move distinct responsibilities into dedicated domain classes.
  - *Rename*: Replace ambiguous variable/method names (`$data`, `$temp`, `$result`) with clear domain terminology.
  - *Move Method / Field*: Relocate behavior to the class that owns the primary data.
  - *Replace Conditional with Polymorphism / Strategy*: Refactor complex nested `if/else` or `switch` blocks.
  - *Introduce Value Object / Form Request*: Encapsulate domain concepts or request validations.
  - *Eliminate Dead Code*: Remove verified unused code.

## Phase 5 — Branch & Git Safety
- Inspect current Git state (`git status`, current branch, uncommitted changes).
- Do NOT destroy or overwrite uncommitted user work.
- Create a dedicated refactoring branch (e.g., `refactor/<short-target-name>`) ONLY if requested by the user or appropriate for the repository workflow.

## Phase 6 — Incremental Refactoring Execution
Execute changes in small, logical steps:
1. Make **one** structural change.
2. Run relevant tests.
3. Inspect diffs to confirm no collateral changes occurred.
4. Repeat for the next step.
- Do NOT combine multiple unrelated refactorings into one massive edit.

## Phase 7 — Code Quality & Clean Code Standards
- **Naming**: Ensure descriptive, unambiguous naming across variables, parameters, methods, classes, and services.
- **Duplication**: Extract shared logic only when duplication represents the same underlying domain concept.
- **Complexity**: Replace deep nesting with guard clauses (`early return`), decompose long methods, reduce parameter lists.
- **Separation of Concerns**: Keep controllers thin (request coordination only); shift business rules to Services/Actions/Domain models.

## Phase 8 — Laravel & PHP Specific Checks
When refactoring PHP / Laravel applications:
- **Fat Controllers & Models**: Move complex business logic from Controllers and Eloquent Models into Action classes or Service classes.
- **Database Efficiency**: Check for N+1 query patterns and missing eager loading (`with()`).
- **Validation & Auth**: Move inline validation into Form Requests (`FormRequest`), and move authorization into Policies/Gates.
- **PHP Modernization**: Use type declarations, return types, constructor property promotion, enums, and match expressions according to the project's target PHP version (`composer.json`).
- **Transactions & Queues**: Wrap multi-step database mutations in `DB::transaction()`.

## Phase 9 — Performance & Optimization
- Benchmark or measure performance ONLY when there is clear evidence or a performance-focused goal.
- Eliminate redundant queries, memory leaks, unindexed DB queries, and heavy loops.
- Do NOT perform speculative micro-optimizations that impair code readability.

## Phase 10 — Design Patterns & Architecture
- Apply design patterns (Strategy, Factory, Adapter, Repository, Command, Observer) ONLY when they solve concrete problems.
- Prefer simplicity and existing repository conventions over abstract complexity.

## Phase 11 — Error Handling & Logging
- Ensure exceptions are caught at appropriate boundaries without swallowing errors silently.
- Add contextual logging with accurate error messages and parameters.
- Provide clear error propagation for APIs and UI layers.

## Phase 12 — Static Analysis & Linting
- Execute configured static analysis and linting tools:
  - **PHP**: `vendor/bin/phpstan`, `vendor/bin/psalm`, `vendor/bin/pint`, `phpcs`.
  - **JS/TS**: `eslint`, `prettier`, `tsc --noEmit`.
  - **Python**: `ruff`, `mypy`, `flake8`.
- Ensure zero new static analysis errors or warnings are introduced.

## Phase 13 — Security Auditing
- Verify that refactoring does not weaken:
  - Authentication or authorization checks.
  - Input validation, sanitization, and SQL injection protections.
  - Mass assignment protections (`$fillable` vs `$guarded`).
  - CSRF/XSS defenses and secret handling.

## Phase 14 — Full Verification & Diff Review
- Execute the full test suite and verify:
  - 100% baseline test pass rate preserved.
  - No new lint or type errors.
  - Diffs are clean, focused, and free of debug statements, temporary code, or accidental formatting changes.

---

# Final Report

After finishing the refactoring, output a concise summary:
1. **Refactoring Summary**: High-level explanation of changes and goals achieved.
2. **Files Changed**: List of added, modified, or deleted files.
3. **Test Results**: Baseline vs Final test suite status and new characterization tests added.
4. **Architectural & Quality Improvements**: Reduced complexity, improved readability, lower coupling.
5. **Performance / Static Analysis**: Summary of linting and performance benchmark results.
6. **Breaking Changes**: Explicitly state `None` or detail any public API shifts.
7. **Recommendations**: Optional follow-up items not included in this iteration.
