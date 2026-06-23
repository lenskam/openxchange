---
# MASTER_TASK.md - Detailed Task List

tasks:
  # ============================================
  # PHASE 1: CORE INFRASTRUCTURE (Completed)
  # ============================================

  - id: 1.1
    description: "Set up Docker Compose with PostgreSQL, Redis, Vault"
    status: completed
    created_at: 2025-01-01T00:00:00Z
    completed_at: 2025-05-15T00:00:00Z
    plan_id: phase-1
    priority: high

  - id: 1.2
    description: "Create backend project structure with FastAPI"
    status: completed
    created_at: 2025-01-01T00:00:00Z
    completed_at: 2025-05-15T00:00:00Z
    plan_id: phase-1
    priority: high

  - id: 1.3
    description: "Implement User model and authentication (JWT)"
    status: completed
    created_at: 2025-01-01T00:00:00Z
    completed_at: 2025-05-15T00:00:00Z
    plan_id: phase-1
    priority: high

  - id: 1.4
    description: "Implement Connection model and basic CRUD API"
    status: completed
    created_at: 2025-01-01T00:00:00Z
    completed_at: 2025-05-15T00:00:00Z
    plan_id: phase-1
    priority: high

  - id: 1.5
    description: "Create frontend React project with MUI"
    status: completed
    created_at: 2025-01-01T00:00:00Z
    completed_at: 2025-05-15T00:00:00Z
    plan_id: phase-1
    priority: high

  - id: 1.6
    description: "Implement Login page with authentication"
    status: completed
    created_at: 2025-01-01T00:00:00Z
    completed_at: 2025-05-15T00:00:00Z
    plan_id: phase-1
    priority: high

  - id: 1.7
    description: "Create Sidebar and TopBar components"
    status: completed
    created_at: 2025-01-01T00:00:00Z
    completed_at: 2025-05-15T00:00:00Z
    plan_id: phase-1
    priority: high

  - id: 1.8
    description: "Create repositories (base, user, connection) and UserService"
    status: completed
    created_at: 2025-05-15T00:00:00Z
    completed_at: 2025-05-15T00:00:00Z
    plan_id: phase-1
    priority: high

  - id: 1.9
    description: "Create API router aggregator (api.py) and fix main.py"
    status: completed
    created_at: 2025-05-15T00:00:00Z
    completed_at: 2025-05-15T00:00:00Z
    plan_id: phase-1
    priority: high

  - id: 1.10
    description: "Create frontend common components (StatusBadge, LoadingSpinner, ErrorBoundary)"
    status: completed
    created_at: 2025-05-15T00:00:00Z
    completed_at: 2025-05-15T00:00:00Z
    plan_id: phase-1
    priority: high

  - id: 1.11
    description: "Create frontend custom hooks (useAuth, useDebounce)"
    status: completed
    created_at: 2025-05-15T00:00:00Z
    completed_at: 2025-05-15T00:00:00Z
    plan_id: phase-1
    priority: high

  - id: 1.12
    description: "Implement Connections full CRUD UI with modal"
    status: completed
    created_at: 2025-05-15T00:00:00Z
    completed_at: 2025-05-15T00:00:00Z
    plan_id: phase-1
    priority: high

  - id: 1.13
    description: "Implement Dashboard with real data and charts"
    status: completed
    created_at: 2025-05-15T00:00:00Z
    completed_at: 2025-05-15T00:00:00Z
    plan_id: phase-1
    priority: high

  - id: 1.14
    description: "Implement Users page with full CRUD and role management"
    status: completed
    created_at: 2025-05-15T00:00:00Z
    completed_at: 2025-05-15T00:00:00Z
    plan_id: phase-1
    priority: high

  - id: 1.15
    description: "Fix bcrypt compatibility and ensure all tests pass"
    status: completed
    created_at: 2025-05-15T00:00:00Z
    completed_at: 2025-05-15T00:00:00Z
    plan_id: phase-1
    priority: high

  # ============================================
  # PHASE 2: MAPPING ENGINE
  # ============================================

  - id: 2.1
    description: "Create Mapping SQLAlchemy model (variable, org_unit, options, date_format)"
    status: completed
    created_at: 2025-01-15T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-2-mapping
    priority: high
    depends_on: [1.4]

  - id: 2.2
    description: "Create Pydantic schemas for Mapping (upload, response)"
    status: completed
    created_at: 2025-01-15T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-2-mapping
    priority: high
    depends_on: [2.1]

  - id: 2.3
    description: "Implement Mapping repository"
    status: completed
    created_at: 2025-01-15T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-2-mapping
    priority: high
    depends_on: [2.2]

  - id: 2.4
    description: "Implement file upload endpoint (CSV, Excel, JSON, XML parsing)"
    status: completed
    created_at: 2025-01-15T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-2-mapping
    priority: high
    depends_on: [2.3]

  - id: 2.5
    description: "Implement MappingEngine service (transformation logic)"
    status: completed
    created_at: 2025-01-15T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-2-mapping
    priority: high
    depends_on: [2.4]

  - id: 2.6
    description: "Create Mappings API endpoints"
    status: completed
    created_at: 2025-01-15T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-2-mapping
    priority: high
    depends_on: [2.5]

  - id: 2.7
    description: "Create Frontend Mappings page with upload functionality"
    status: completed
    created_at: 2025-01-15T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-2-mapping
    priority: high
    depends_on: [2.6]

  - id: 2.8
    description: "Add Mappings page to routing and sidebar"
    status: completed
    created_at: 2025-01-15T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-2-mapping
    priority: medium
    depends_on: [2.7]

  # ============================================
  # PHASE 3: WORKFLOW & CHANNEL MANAGEMENT
  # ============================================

  - id: 3.1
    description: "Create Workflow SQLAlchemy model"
    status: completed
    created_at: 2025-01-22T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-3-workflow-channel
    priority: high
    depends_on: [1.4]

  - id: 3.2
    description: "Create Channel SQLAlchemy model"
    status: completed
    created_at: 2025-01-22T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-3-workflow-channel
    priority: high
    depends_on: [3.1]

  - id: 3.3
    description: "Create Pydantic schemas for Workflow and Channel"
    status: completed
    created_at: 2025-01-22T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-3-workflow-channel
    priority: high
    depends_on: [3.2]

  - id: 3.4
    description: "Implement Workflow repository and service"
    status: completed
    created_at: 2025-01-22T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-3-workflow-channel
    priority: high
    depends_on: [3.3]

  - id: 3.5
    description: "Implement Channel repository and service"
    status: completed
    created_at: 2025-01-22T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-3-workflow-channel
    priority: high
    depends_on: [3.4]

  - id: 3.6
    description: "Create Workflow API endpoints"
    status: completed
    created_at: 2025-01-22T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-3-workflow-channel
    priority: high
    depends_on: [3.5]

  - id: 3.7
    description: "Create Channel API endpoints"
    status: completed
    created_at: 2025-01-22T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-3-workflow-channel
    priority: high
    depends_on: [3.6]

  - id: 3.8
    description: "Set up Celery Beat for workflow scheduling"
    status: completed
    created_at: 2025-01-22T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-3-workflow-channel
    priority: high
    depends_on: [3.6]

  - id: 3.9
    description: "Create Frontend Workflows page"
    status: completed
    created_at: 2025-01-22T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-3-workflow-channel
    priority: high
    depends_on: [3.7]

  - id: 3.10
    description: "Create Frontend Channels page"
    status: completed
    created_at: 2025-01-22T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-3-workflow-channel
    priority: high
    depends_on: [3.9]

  # ============================================
  # PHASE 4: EXECUTION ENGINE & TRANSACTIONS
  # ============================================

  - id: 4.1
    description: "Create Transaction SQLAlchemy model"
    status: completed
    created_at: 2025-01-27T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-4-execution
    priority: high
    depends_on: [3.1]

  - id: 4.2
    description: "Create AuditLog SQLAlchemy model"
    status: completed
    created_at: 2025-01-27T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-4-execution
    priority: high
    depends_on: [4.1]

  - id: 4.3
    description: "Implement workflow executor Celery task"
    status: completed
    created_at: 2025-01-27T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-4-execution
    priority: high
    depends_on: [4.2]

  - id: 4.4
    description: "Implement external system adapters (DHIS2, FHIR, etc.)"
    status: completed
    created_at: 2025-01-27T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-4-execution
    priority: high
    depends_on: [4.3]

  - id: 4.5
    description: "Set up WebSocket for real-time transaction updates"
    status: completed
    created_at: 2025-01-27T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-4-execution
    priority: high
    depends_on: [4.4]

  - id: 4.6
    description: "Create Transactions API endpoints"
    status: completed
    created_at: 2025-01-27T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-4-execution
    priority: high
    depends_on: [4.5]

  - id: 4.7
    description: "Create Audit Logs API endpoints"
    status: completed
    created_at: 2025-01-27T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-4-execution
    priority: medium
    depends_on: [4.6]

  - id: 4.8
    description: "Create Frontend Transactions page"
    status: completed
    created_at: 2025-01-27T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-4-execution
    priority: high
    depends_on: [4.7]

  - id: 4.9
    description: "Dashboard enhancements with real transaction data, stat cards, and charts"
    status: completed
    created_at: 2025-01-27T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-4-execution
    priority: high
    depends_on: [4.8]

  # ============================================
  # PHASE 5: ADVANCED FEATURES & POLISH
  # ============================================

  - id: 5.1
    description: "Complete Dashboard with charts (Recharts) and widgets"
    status: completed
    created_at: 2025-02-01T00:00:00Z
    completed_at: 2025-05-15T00:00:00Z
    plan_id: phase-5-advanced
    priority: high
    depends_on: [4.6]
    note: "Already completed during Phase 1 implementation (task 1.13)"

  - id: 5.2
    description: "Create Settings page - Profile tab"
    status: completed
    created_at: 2025-02-01T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-5-advanced
    priority: high
    depends_on: [5.1]

  - id: 5.3
    description: "Create Settings page - Organization tab"
    status: completed
    created_at: 2025-02-01T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-5-advanced
    priority: high
    depends_on: [5.2]

  - id: 5.4
    description: "Create Settings page - Notifications tab"
    status: completed
    created_at: 2025-02-01T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-5-advanced
    priority: medium
    depends_on: [5.3]

  - id: 5.5
    description: "Create Settings page - Security tab (API keys)"
    status: completed
    created_at: 2025-02-01T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-5-advanced
    priority: medium
    depends_on: [5.4]

  - id: 5.6
    description: "Create Settings page - System tab (admin operations)"
    status: completed
    created_at: 2025-02-01T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-5-advanced
    priority: medium
    depends_on: [5.5]

  - id: 5.7
    description: "Create Frontend Audit Log page with pagination and search"
    status: completed
    created_at: 2025-02-01T00:00:00Z
    completed_at: 2026-06-18T00:00:00Z
    plan_id: phase-5-advanced
    priority: high
    depends_on: [5.6]

  - id: 5.8
    description: "Enhance Users page with full CRUD and role management"
    status: completed
    created_at: 2025-02-01T00:00:00Z
    completed_at: 2025-05-15T00:00:00Z
    plan_id: phase-5-advanced
    priority: medium
    depends_on: []
    note: "Already completed during Phase 1 implementation (task 1.14)"

  # ============================================
  # PHASE 6: CI/CD & DEPLOYMENT (Simplified for single-VPS)
  # ============================================

  - id: 6.1
    description: "Create GitHub Actions CI workflow — simplified deploy step added"
    status: completed
    created_at: 2025-02-08T00:00:00Z
    completed_at: 2026-06-23T00:00:00Z
    plan_id: phase-6-cicd
    priority: high
    note: "Deploy job added to ci.yml — SSHs into VPS, pulls, rebuilds, runs migrations"

  - id: 6.2
    description: "Create production Docker Compose configuration"
    status: completed
    created_at: 2025-02-08T00:00:00Z
    completed_at: 2026-06-23T00:00:00Z
    plan_id: phase-6-cicd
    priority: high
    note: "Updated docker-compose.prod.yml with Dockerfile.prod, healthchecks, logging"

  - id: 6.3
    description: "Vault production mode (deferred — dev mode acceptable for single-VPS)"
    status: cancelled
    created_at: 2025-02-08T00:00:00Z
    completed_at: 2026-06-23T00:00:00Z
    plan_id: phase-6-cicd
    priority: low
    note: "Deferred — Vault dev mode sufficient for single-tenant single-VPS deployment"

  - id: 6.4
    description: "Nginx reverse proxy with SSL — already configured, updated frontend port"
    status: completed
    created_at: 2025-02-08T00:00:00Z
    completed_at: 2026-06-23T00:00:00Z
    plan_id: phase-6-cicd
    priority: high
    note: "Host nginx with Cloudflare SSL already running. Updated frontend upstream to :8080"

  - id: 6.5
    description: "Database backup script"
    status: completed
    created_at: 2025-02-08T00:00:00Z
    completed_at: 2026-06-23T00:00:00Z
    plan_id: phase-6-cicd
    priority: high
    note: "deploy/backup.sh — pg_dump custom format, compressed, 30-day retention, local disk"

  - id: 6.6
    description: "Health check endpoints"
    status: completed
    created_at: 2025-02-08T00:00:00Z
    completed_at: 2026-06-23T00:00:00Z
    plan_id: phase-6-cicd
    priority: high
    note: "Backend /health now checks DB, Redis, Vault connectivity. Returns 503 on failure."

  - id: 6.7
    description: "Load balancing and scaling (deferred — single VPS)"
    status: cancelled
    created_at: 2025-02-08T00:00:00Z
    completed_at: 2026-06-23T00:00:00Z
    plan_id: phase-6-cicd
    priority: low
    note: "Deferred — horizontal scaling not applicable on single VPS without Docker Swarm/K8s"

  - id: 6.8
    description: "Prometheus/Grafana monitoring (deferred — minimal monitoring preferred)"
    status: cancelled
    created_at: 2025-02-08T00:00:00Z
    completed_at: 2026-06-23T00:00:00Z
    plan_id: phase-6-cicd
    priority: low
    note: "Deferred per user preference for minimal monitoring. Docker healthchecks are in place."

  - id: 6.9
    description: "Disaster recovery runbook (deferred — overkill for single-VPS MVP)"
    status: cancelled
    created_at: 2025-02-08T00:00:00Z
    completed_at: 2026-06-23T00:00:00Z
    plan_id: phase-6-cicd
    priority: low
    note: "Deferred. Backups + health checks provide basic DR coverage."

  # New simplified Phase 6 tasks

  - id: 6.10
    description: "Create backend/Dockerfile.prod (multi-stage, no --reload, HEALTHCHECK)"
    status: completed
    created_at: 2026-06-23T00:00:00Z
    completed_at: 2026-06-23T00:00:00Z
    plan_id: phase-6-cicd-implementation-plan
    priority: high

  - id: 6.11
    description: "Create frontend/Dockerfile.prod + nginx.conf (multi-stage SPA build + serve)"
    status: completed
    created_at: 2026-06-23T00:00:00Z
    completed_at: 2026-06-23T00:00:00Z
    plan_id: phase-6-cicd-implementation-plan
    priority: high

  - id: 6.12
    description: "Update deploy/docker-compose.prod.yml (prod Dockerfiles, healthchecks, logging)"
    status: completed
    created_at: 2026-06-23T00:00:00Z
    completed_at: 2026-06-23T00:00:00Z
    plan_id: phase-6-cicd-implementation-plan
    priority: high

  - id: 6.13
    description: "Update Nginx config (frontend proxy port 5173 → 8080)"
    status: completed
    created_at: 2026-06-23T00:00:00Z
    completed_at: 2026-06-23T00:00:00Z
    plan_id: phase-6-cicd-implementation-plan
    priority: high

  - id: 6.14
    description: "Improve backend /health endpoint (DB, Redis, Vault checks)"
    status: completed
    created_at: 2026-06-23T00:00:00Z
    completed_at: 2026-06-23T00:00:00Z
    plan_id: phase-6-cicd-implementation-plan
    priority: high

  - id: 6.15
    description: "Create deploy/backup.sh (pg_dump, compression, 30-day retention)"
    status: completed
    created_at: 2026-06-23T00:00:00Z
    completed_at: 2026-06-23T00:00:00Z
    plan_id: phase-6-cicd-implementation-plan
    priority: medium
    note: "Set up cron: 0 3 * * * /usr/local/bin/interxchange-backup"

  - id: 6.16
    description: "Add deploy job to GitHub Actions CI (SSH deploy on push to main)"
    status: completed
    created_at: 2026-06-23T00:00:00Z
    completed_at: 2026-06-23T00:00:00Z
    plan_id: phase-6-cicd-implementation-plan
    priority: high
    note: "Requires GitHub secrets: SSH_HOST, SSH_USER, SSH_KEY"

  - id: 6.17
    description: "Verify nginx logrotate covers interxchange logs"
    status: completed
    created_at: 2026-06-23T00:00:00Z
    completed_at: 2026-06-23T00:00:00Z
    plan_id: phase-6-cicd-implementation-plan
    priority: low
    note: "Global /var/log/nginx/*.log pattern already covers interxchange logs"

  # ============================================
  # PHASE 7: TESTING, OPTIMIZATION & DOCUMENTATION
  # ============================================

  - id: 7.1
    description: "End-to-end testing with Cypress (auth, connections, workflows, mappings, transactions, dashboard)"
    status: pending
    created_at: 2025-02-15T00:00:00Z
    plan_id: phase-7-testing
    priority: high
    depends_on: [5.7, 6.9]

  - id: 7.2
    description: "Performance testing with k6 (load test 100 users, stress test 1000 users)"
    status: pending
    created_at: 2025-02-15T00:00:00Z
    plan_id: phase-7-testing
    priority: high
    depends_on: [7.1]

  - id: 7.3
    description: "Security testing with OWASP ZAP and penetration test scripts"
    status: pending
    created_at: 2025-02-15T00:00:00Z
    plan_id: phase-7-testing
    priority: high
    depends_on: [7.2]

  - id: 7.4
    description: "Complete API documentation with OpenAPI schema, curl and SDK examples"
    status: pending
    created_at: 2025-02-15T00:00:00Z
    plan_id: phase-7-testing
    priority: high
    depends_on: [7.1]

  - id: 7.5
    description: "User documentation - complete user guide (10 sections)"
    status: pending
    created_at: 2025-02-15T00:00:00Z
    plan_id: phase-7-testing
    priority: medium
    depends_on: [7.4]

  - id: 7.6
    description: "Training materials - video scripts and quick reference cards"
    status: pending
    created_at: 2025-02-15T00:00:00Z
    plan_id: phase-7-testing
    priority: medium
    depends_on: [7.5]

  - id: 7.7
    description: "Production readiness checklist and final code review"
    status: pending
    created_at: 2025-02-15T00:00:00Z
    plan_id: phase-7-testing
    priority: high
    depends_on: [7.3, 7.6]

  # ============================================
  # PHASE 8: POST-LAUNCH & CONTINUOUS IMPROVEMENT
  # ============================================

  - id: 8.1
    description: "Production monitoring and observability enhancement (Grafana, Loki, Promtail)"
    status: pending
    created_at: 2025-02-22T00:00:00Z
    plan_id: phase-8-post-launch
    priority: high
    depends_on: [7.7]

  - id: 8.2
    description: "Incident response procedures (runbook, severity levels, escalation paths)"
    status: pending
    created_at: 2025-02-22T00:00:00Z
    plan_id: phase-8-post-launch
    priority: high
    depends_on: [8.1]

  - id: 8.3
    description: "Automated bug reporting and error tracking (Sentry integration)"
    status: pending
    created_at: 2025-02-22T00:00:00Z
    plan_id: phase-8-post-launch
    priority: high
    depends_on: [8.2]

  - id: 8.4
    description: "User feedback collection system (model, API, Slack notifications)"
    status: pending
    created_at: 2025-02-22T00:00:00Z
    plan_id: phase-8-post-launch
    priority: medium
    depends_on: [8.3]

  - id: 8.5
    description: "Continuous deployment improvements (blue-green deploy, A/B testing, feature flags)"
    status: pending
    created_at: 2025-02-22T00:00:00Z
    plan_id: phase-8-post-launch
    priority: medium
    depends_on: [8.4]

  - id: 8.6
    description: "Database maintenance automation (vacuum, reindex, partitioning)"
    status: pending
    created_at: 2025-02-22T00:00:00Z
    plan_id: phase-8-post-launch
    priority: medium
    depends_on: [8.5]

  - id: 8.7
    description: "Performance optimization report and monitoring script"
    status: pending
    created_at: 2025-02-22T00:00:00Z
    plan_id: phase-8-post-launch
    priority: medium
    depends_on: [8.6]

  - id: 8.8
    description: "Continuous improvement roadmap (v1.1, v1.2, v2.0 planning)"
    status: pending
    created_at: 2025-02-22T00:00:00Z
    plan_id: phase-8-post-launch
    priority: medium
    depends_on: [8.7]

  - id: 8.9
    description: "Post-launch checklist and 30-day sign-off"
    status: pending
    created_at: 2025-02-22T00:00:00Z
    plan_id: phase-8-post-launch
    priority: high
    depends_on: [8.8]

  # ============================================
  # PHASE 9: FINAL PROJECT DOCUMENTATION
  # ============================================

  - id: 9.1
    description: "Complete technical specifications document (architecture, DB schema, API, security, deployment)"
    status: pending
    created_at: 2025-05-18T00:00:00Z
    plan_id: phase-9-documentation
    priority: high
    depends_on: [8.9]

  - id: 9.2
    description: "Complete API reference document (53 endpoints with schemas, SDK examples)"
    status: pending
    created_at: 2025-05-18T00:00:00Z
    plan_id: phase-9-documentation
    priority: high
    depends_on: [9.1]

  - id: 9.3
    description: "Developer onboarding guide (setup, project structure, code standards, debugging)"
    status: pending
    created_at: 2025-05-18T00:00:00Z
    plan_id: phase-9-documentation
    priority: medium
    depends_on: [9.2]

  - id: 9.4
    description: "Security and compliance documentation (auth, RBAC, encryption, GDPR/HIPAA)"
    status: pending
    created_at: 2025-05-18T00:00:00Z
    plan_id: phase-9-documentation
    priority: medium
    depends_on: [9.3]

  - id: 9.5
    description: "Project closeout report (deliverables, metrics, lessons learned, budget)"
    status: pending
    created_at: 2025-05-18T00:00:00Z
    plan_id: phase-9-documentation
    priority: medium
    depends_on: [9.4]

  # ============================================
  # PHASE 10: STITCH DESIGN INTEGRATION (Completed)
  # ============================================

  - id: 10.1
    description: "Configure Stitch MCP with OAuth2 access token via wrapper script"
    status: completed
    created_at: 2026-05-19T00:00:00Z
    completed_at: 2026-05-19T00:00:00Z
    plan_id: (direct)
    priority: high

  - id: 10.2
    description: "Download all 9 Stitch design screens (Dashboard, Connections, Workflows, Transactions, Channels, Mappings, Users, Audit Log, Settings)"
    status: completed
    created_at: 2026-05-19T00:00:00Z
    completed_at: 2026-05-19T00:00:00Z
    plan_id: (direct)
    priority: high

  - id: 10.3
    description: "Install and configure Tailwind CSS v4 with Stitch design tokens"
    status: completed
    created_at: 2026-05-19T00:00:00Z
    completed_at: 2026-05-19T00:00:00Z
    plan_id: (direct)
    priority: high

  - id: 10.4
    description: "Refactor Sidebar and TopBar from MUI to Tailwind"
    status: completed
    created_at: 2026-05-19T00:00:00Z
    completed_at: 2026-05-19T00:00:00Z
    plan_id: (direct)
    priority: high

  - id: 10.5
    description: "Update App.tsx layout to use Tailwind sidebar offset + max-width container"
    status: completed
    created_at: 2026-05-19T00:00:00Z
    completed_at: 2026-05-19T00:00:00Z
    plan_id: (direct)
    priority: high

  - id: 10.6
    description: "Rewrite DashboardPage to match Stitch design (glass cards, charts, activity feed, workflow grid)"
    status: completed
    created_at: 2026-05-19T00:00:00Z
    completed_at: 2026-05-19T00:00:00Z
    plan_id: (direct)
    priority: high

  - id: 10.7
    description: "Rewrite ConnectionsPage to match Stitch design (typed cards, CRUD, sync activity)"
    status: completed
    created_at: 2026-05-19T00:00:00Z
    completed_at: 2026-05-19T00:00:00Z
    plan_id: (direct)
    priority: high

  - id: 10.8
    description: "Create WorkflowsPage matching Stitch design (cards with status bar, source→destination)"
    status: completed
    created_at: 2026-05-19T00:00:00Z
    completed_at: 2026-05-19T00:00:00Z
    plan_id: (direct)
    priority: high

  - id: 10.9
    description: "Create TransactionsPage matching Stitch design (summary pills, table, info drawer)"
    status: completed
    created_at: 2026-05-19T00:00:00Z
    completed_at: 2026-05-19T00:00:00Z
    plan_id: (direct)
    priority: high

  - id: 10.10
    description: "Create ChannelsPage matching Stitch design (stats grid, table with toggles, activity timeline)"
    status: completed
    created_at: 2026-05-19T00:00:00Z
    completed_at: 2026-05-19T00:00:00Z
    plan_id: (direct)
    priority: high

  - id: 10.11
    description: "Create MappingsPage matching Stitch design (4-column bento cards, table with type badges)"
    status: completed
    created_at: 2026-05-19T00:00:00Z
    completed_at: 2026-05-19T00:00:00Z
    plan_id: (direct)
    priority: high

  - id: 10.12
    description: "Refactor UsersPage from MUI-heavy to Tailwind matching Stitch design (stat cards, role filter, status pills)"
    status: completed
    created_at: 2026-05-19T00:00:00Z
    completed_at: 2026-05-19T00:00:00Z
    plan_id: (direct)
    priority: high

  - id: 10.13
    description: "Create AuditLogPage matching Stitch design (4-column stats, searchable event table, info banner)"
    status: completed
    created_at: 2026-05-19T00:00:00Z
    completed_at: 2026-05-19T00:00:00Z
    plan_id: (direct)
    priority: high

  - id: 10.14
    description: "Create SettingsPage matching Stitch design (hero banner, tabbed navigation, Profile form, placeholder tabs)"
    status: completed
    created_at: 2026-05-19T00:00:00Z
    completed_at: 2026-05-19T00:00:00Z
    plan_id: (direct)
    priority: high

  - id: 10.15
    description: "Update GEMINI.md technology stack with Tailwind CSS v4"
    status: completed
    created_at: 2026-05-19T00:00:00Z
    completed_at: 2026-05-19T00:00:00Z
    plan_id: (direct)
    priority: medium

  - id: 10.16
    description: "Update MASTER_TASK.md with Stitch redesign tasks"
    status: completed
    created_at: 2026-05-19T00:00:00Z
    completed_at: 2026-05-19T00:00:00Z
    plan_id: (direct)
    priority: medium

  - id: 10.17
    description: "Verify frontend builds successfully with all new pages"
    status: completed
    created_at: 2026-05-19T00:00:00Z
    completed_at: 2026-05-19T00:00:00Z
    plan_id: (direct)
    priority: high
