---
name: architecture-documentation
description: |
  Generates comprehensive, professional software architecture documentation and diagrams by analyzing the repository codebase.
  Produces C4 diagrams (Context, Container, Component), Arc42 documentation, PlantUML/Mermaid diagrams, Architecture Decision Records (ADRs), 
  data architecture maps, API definitions, security threat models, deployment views, quality attribute assessments, and architectural debt analysis.
  Use when asked to document, analyze, map, review, or generate architecture docs for any project (e.g., Laravel, Node.js, Python, Go, Java, React).
metadata:
  version: v1
  publisher: local
---

# Architecture Documentation Generator

## Purpose
Analyze an existing software repository and generate clear, accurate, and maintainable software architecture documentation and visual diagrams based strictly on codebase evidence.

The resulting documentation must reflect the **actual system as built**.
- **Do NOT invent** components, services, databases, APIs, integrations, deployment environments, or security controls that cannot be substantiated by source code, configs, or existing documentation.
- When information is missing or unclear from the code, explicitly mark it as `Unknown`, `Not Detected`, or `Requires Clarification`.
- Maintain a strict boundary between **Existing Architecture** (what is currently present) and **Improvement Recommendations** (proposed future changes).

---

# Modes & Parameters

When executing this skill, check if the user specified any flags or target frameworks in their prompt:

| Flag | Focus / Output |
|---|---|
| `--c4-model` | Focuses on C4 diagrams: System Context (L1), Container View (L2), Component View (L3), and Code/Class View (L4). |
| `--arc42` | Generates documentation using the standard Arc42 architectural template. |
| `--adr` | Focuses on identifying and generating Architecture Decision Records (ADRs). |
| `--plantuml` / `--mermaid` | Generates standalone PlantUML or Mermaid diagram source files. |
| `--full-suite` *(Default if unassigned)* | Generates the complete architecture documentation suite (README, C4, Data, API, Security, Deployment, ADRs, Debt, Recommendations). |

---

# Architecture Discovery Workflow

Perform a structured discovery of the repository using search tools (`grep_search`, `list_dir`, `view_file`):

1. **Framework & Language Detection**:
   - Inspect package manifests (`composer.json`, `package.json`, `requirements.txt`, `go.mod`, `pom.xml`, `build.gradle`, `Cargo.toml`).
   - Identify core frameworks (e.g., Laravel, Symfony, Express, Next.js, Django, FastAPI, Spring Boot).

2. **Existing Documentation & Diagrams**:
   - Check `README.md`, `docs/`, `architecture/`, `*.md`, `*.puml`, `*.drawio`, `*.mmd`.

3. **Entry Points & Routing / APIs**:
   - Locate route definitions (e.g., `routes/web.php`, `routes/api.php`, `src/routes/`, `controllers/`, OpenAPI/Swagger specifications).

4. **Data & Storage Architecture**:
   - Inspect database migrations, ORM models (e.g., Eloquent Models, TypeORM entities, SQLAlchemy, Prisma schemas), database configs (`config/database.php`, `schema.sql`), caching mechanisms (Redis, Memcached), queues, and file storage.

5. **Services, Middleware & Core Logic**:
   - Examine business logic layers (`app/Services/`, `app/Actions/`, `src/services/`, domain services, jobs, events/listeners).

6. **Infrastructure & Deployment**:
   - Inspect `docker-compose.yml`, `Dockerfile`, `k8s/`, Helm charts, `nginx.conf`, Apache `.htaccess`, CI/CD pipelines (`.github/workflows/`), `.env.example`.

7. **Security & Authentication**:
   - Examine authentication drivers (Sanctum, Passport, JWT, OAuth), middleware, authorization policies/guards, CORS, CSRF, and input validation schemas.

---

# Documentation Outputs Structure

All documentation should be generated under `docs/architecture/` (or the project's preferred docs directory):

```
docs/architecture/
├── README.md                   # Executive Architecture Overview & Index
├── c4-model.md                 # C4 Architecture Diagrams & Explanations
├── data-architecture.md        # Database Schemas, Models, Data Flow & Persistence
├── api-architecture.md         # API Endpoints, Contracts, Auth & Integrations
├── security-architecture.md    # Security Controls, Auth Flows & Threat Model
├── deployment-architecture.md  # Infrastructure, Containers, Web Server & CI/CD
├── quality-attributes.md       # Scalability, Performance, Availability & Observability
├── architecture-debt.md        # Technical Debt, Vulnerabilities & Code Smells
├── recommendations.md          # Architectural Improvement Roadmap
├── adrs/                       # Architectural Decision Records
│   ├── 0001-record-architecture-decisions.md
│   └── 0002-...
└── diagrams/                   # Raw Diagram Source Files (Mermaid / PlantUML)
    ├── c4-context.puml / .mmd
    ├── c4-container.puml / .mmd
    └── data-flow.puml / .mmd
```

---

# Section Detail Specifications

### 1. System Overview (`docs/architecture/README.md`)
- High-level architecture pattern (e.g., Monolith, Layered MVC, Microservices, Event-Driven, Serverless).
- Tech Stack inventory (Languages, Frameworks, DBs, Caches, Web Servers, Queues).
- Core system responsibilities and external system integrations.
- Navigation links to all detailed architecture documents and ADRs.

### 2. C4 Model Diagrams (`docs/architecture/c4-model.md` & `diagrams/`)
- **Level 1: System Context**: Users, Personas, Main System, External Systems/APIs.
- **Level 2: Container View**: Web applications, APIs, Mobile apps, Background Workers, Databases, Caches, Storage, External Services.
- **Level 3: Component View**: Break down major containers into key components (e.g., Controllers, Service layer, Repositories, Queue Workers, Event Listeners).
- **Level 4: Code View** *(Optional/Selective)*: Detailed class or sequence diagrams for high-complexity core workflows.
- *Format*: Generate valid **Mermaid** or **PlantUML** code blocks so they render directly in Markdown viewers.

### 3. Data Architecture (`docs/architecture/data-architecture.md`)
- Primary & secondary storage technologies (MySQL, PostgreSQL, MongoDB, Redis, S3/local storage).
- Key domain entities, relationships, and ER diagrams.
- Data access patterns (ORM, raw SQL, Repositories).
- Migration strategy and data lifecycle.
- Caching strategy, invalidation rules, and queue storage patterns.

### 4. API & Integration Architecture (`docs/architecture/api-architecture.md`)
- REST, GraphQL, gRPC, or WebSocket endpoints grouped by feature domain.
- Request/response contracts, serialization, validation rules.
- Authentication/Authorization methods for endpoints (Bearer tokens, Session cookies, API keys).
- Third-party external API dependencies, webhooks, and fault handling (retries, circuit breakers).

### 5. Security Architecture (`docs/architecture/security-architecture.md`)
- Identity & Access Management (Authentication mechanisms, RBAC/ABAC permissions).
- Network & Data Security (HTTPS, Encryption at rest/in transit, Secrets management).
- Application Hardening (CSRF, CORS, SQL Injection defenses, Input sanitization, File upload safety).
- High-level Threat Model (Trust boundaries, entry points, potential security risks).

### 6. Infrastructure & Deployment (`docs/architecture/deployment-architecture.md`)
- Deployment topology (Docker containers, Nginx/Apache reverse proxy, PHP-FPM / Node runtime environment).
- Process execution model (Web server processes, CLI commands, Cron jobs, Queue listeners).
- Environment configurations and multi-stage pipelines (Dev, Staging, Prod).

### 7. Quality Attributes & Architectural Debt (`docs/architecture/architecture-debt.md`)
- **Scalability & Bottlenecks**: Potential N+1 query patterns, unindexed database columns, memory-heavy operations, single points of failure.
- **Code Coupling & Smells**: God classes, business logic in controllers/views, circular dependencies, missing interface abstractions.
- **Classification**: Tag findings as `Critical`, `High`, `Medium`, or `Low`. Provide evidence (file paths and line numbers) for every debt item.

### 8. Architecture Decision Records (`docs/architecture/adrs/`)
Create standardized ADRs for key structural choices detected in the project:
```markdown
# [ADR-000X] [Title of Decision]

## Status
[Accepted | Superceded | Proposed]

## Context
[What was the technical requirement or context?]

## Decision
[What architecture pattern, framework, or technology choice was made?]

## Consequences
[Positive and negative impacts of this decision]
```

---

# Verification & Quality Assurance

Before concluding documentation generation:
1. **Verify References**: Ensure every file path, controller, model, or route mentioned exists in the codebase.
2. **Validate Diagram Syntax**: Test that Mermaid (`mermaid`) or PlantUML (`plantuml`) blocks have valid syntax with correct directional arrows and entity names.
3. **Check Consistency**: Ensure technology names and version numbers match `package.json`, `composer.json`, or environment configs consistently across all generated docs.
4. **Formatting**: Ensure all generated markdown files conform to standard GitHub Flavored Markdown (GFM).

---

# Safety Guidelines

- **Do NOT delete, overwrite, or refactor any application source code** during analysis.
- **Do NOT alter existing production configurations** or database migrations.
- If existing documentation files exist in `docs/` or `README.md`, preserve any accurate manual context and append/integrate new architectural insights cleanly.
