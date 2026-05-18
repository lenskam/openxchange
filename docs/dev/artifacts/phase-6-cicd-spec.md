# Phase 6: CI/CD & Deployment - Technical Specification

## Overview
This phase sets up continuous integration, continuous deployment, and production-ready infrastructure.

## GitHub Actions CI Workflow

### Jobs
1. **test-backend**: Python tests with coverage
2. **test-frontend**: Node.js tests with coverage
3. **build-and-scan**: Docker build + Trivy security scan
4. **deploy**: Production deployment (on main branch)

### Test Matrix
- Python 3.11
- Node.js 20
- PostgreSQL 15 service
- Redis service

## Production Docker Compose

### Services
- PostgreSQL (production config with backup)
- Redis (production config)
- Vault (production mode with auto-unseal)
- Backend (multi-stage build)
- Frontend (multi-stage build with nginx)
- Celery Worker
- Celery Beat
- Prometheus (optional)
- Grafana (optional)

### Configuration
- No volume mounts for code
- Use built images from registry
- Environment variables for secrets
- Health checks for all services

## Vault Configuration

### Production Setup
- Use approle authentication
- Enable audit logging
- Configure auto-unseal (AWS KMS, etc.)
- Secret paths:
  - `secret/data/database` - DB credentials
  - `secret/data/jwt` - JWT secrets
  - `secret/data/connections/{id}` - Connection credentials

## SSL/TLS Configuration

### Certificate Management
- Let's Encrypt via Certbot for automatic certificate renewal
- Nginx reverse proxy terminates TLS for backend and frontend
- Internal services communicate over plain HTTP within Docker network

### TLS Settings
- Minimum TLS version: 1.2
- Preferred ciphers: modern compatibility profile
- HSTS headers enabled for production domain

## Database Backup & Restore

### Backup Strategy
- Daily automated pg_dump to S3-compatible storage
- WAL archiving for point-in-time recovery (last 7 days)
- Retention: daily backups for 30 days, monthly for 12 months

### Restore Procedures
- Restore to a staging environment first for verification
- Documented runbook for full and partial restore scenarios
- Automated restore testing on a monthly schedule

## Health Checks & Monitoring Alerts

### Health Check Endpoints
- `/health` - Basic health: DB, Redis, Celery connectivity
- `/readiness` - Readiness: all services operational
- `/liveness` - Liveness: process alive

### Monitoring Alerts
- Backend down: PagerDuty/OpsGenie notification
- High error rate (>5%): Slack alert
- Transaction backlog (>100): Email notification
- Certificate expiry (<30 days): Weekly reminder

## Load Balancing & Scaling

### Load Balancing
- Nginx upstream for backend replicas
- Round-robin distribution
- Sticky sessions disabled (stateless API design)

### Scaling Configuration
- Backend API: horizontal scaling via Docker Compose replicas (2-4 instances)
- Celery workers: scale based on queue depth (auto-scaling via Docker Swarm/K8s)
- Redis: single instance for MVP, Redis Cluster for higher throughput
- PostgreSQL: connection pooling via PgBouncer

## Disaster Recovery

### Recovery Objectives
- RPO (Recovery Point Objective): 1 hour (via WAL streaming)
- RTO (Recovery Time Objective): 30 minutes for API, 2 hours for full stack

### DR Procedures
- Multi-region deployment (primary + standby region)
- DNS failover via Route53 or equivalent
- Infrastructure-as-code for full environment rebuild (Terraform)
- Documented disaster recovery runbook with step-by-step instructions

## Prometheus Metrics

### Endpoints
- `/metrics` - Prometheus scrape endpoint
- Standard metrics: requests, errors, latency

### Custom Metrics
- workflow_executions_total
- transaction_status_total
- api_requests_total