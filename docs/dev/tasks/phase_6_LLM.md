# Phase 6 Implementation Prompt for Gemini

Based on the **Interxchange GEMINI.md** development guide, here is a comprehensive prompt for the Gemini AI agent to execute **Phase 6: CI/CD & Production Deployment**.

---

## PROMPT: Implement Interxchange Phase 6 - CI/CD & Production Deployment

You are the **Gemini AI agent** tasked with implementing **Phase 6: CI/CD & Production Deployment** of the Interxchange interoperability platform according to the specifications in the `GEMINI.md` development guide.

### Phase 6 Scope (Parallel to other phases)

- GitHub Actions CI/CD pipeline (test, build, scan, deploy)
- Production Docker Compose configuration
- HashiCorp Vault production setup
- SSL/TLS configuration
- Database backup and restore procedures
- Health checks and monitoring alerts
- Load balancing and scaling configuration
- Disaster recovery procedures

### Timeline Expectations (7 days)

- Day 1: GitHub Actions workflow (test, build, security scan)
- Day 2: Production Docker Compose + environment configuration
- Day 3: Vault production setup and secret management
- Day 4: SSL/TLS, Nginx reverse proxy configuration
- Day 5: Database backup scripts and scheduled jobs
- Day 6: Monitoring alerts (Prometheus rules, Grafana alerts)
- Day 7: Load testing, scaling configuration, documentation

---

## TASK 1: GitHub Actions CI/CD Pipeline

### Complete CI/CD Workflow (`.github/workflows/ci-cd.yml`)

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop, release/*]
    tags: ["v*"]
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: "0 2 * * *" # Daily security scan

env:
  REGISTRY: ghcr.io
  IMAGE_NAME_BACKEND: ${{ github.repository }}-backend
  IMAGE_NAME_FRONTEND: ${{ github.repository }}-frontend

jobs:
  # ============================================
  # CODE QUALITY & LINTING
  # ============================================

  lint-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install dependencies
        working-directory: ./backend
        run: |
          python -m pip install --upgrade pip
          pip install flake8 black isort mypy

      - name: Run black (format check)
        working-directory: ./backend
        run: black --check --line-length 88 app/

      - name: Run isort (import sort check)
        working-directory: ./backend
        run: isort --check-only --profile black app/

      - name: Run flake8 (linting)
        working-directory: ./backend
        run: flake8 app/ --max-line-length=88 --extend-ignore=E203,W503

      - name: Run mypy (type checking)
        working-directory: ./backend
        run: mypy app/ --ignore-missing-imports

  lint-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Run ESLint
        working-directory: ./frontend
        run: npm run lint

      - name: Run Prettier check
        working-directory: ./frontend
        run: npx prettier --check "src/**/*.{ts,tsx,css}"

  # ============================================
  # TESTING
  # ============================================

  test-backend:
    runs-on: ubuntu-latest
    needs: [lint-backend]

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      vault:
        image: vault:1.13
        env:
          VAULT_DEV_ROOT_TOKEN_ID: test_token
          VAULT_DEV_LISTEN_ADDRESS: 0.0.0.0:8200
        ports:
          - 8200:8200
        options: >-
          --cap-add=IPC_LOCK

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install dependencies
        working-directory: ./backend
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements/dev.txt
          pip install pytest-cov pytest-asyncio

      - name: Run migrations
        working-directory: ./backend
        env:
          DATABASE_URL: postgresql+asyncpg://test_user:test_password@localhost/test_db
          REDIS_URL: redis://localhost:6379/0
          VAULT_ADDR: http://localhost:8200
          VAULT_TOKEN: test_token
          JWT_SECRET_KEY: test_secret_key
          JWT_REFRESH_SECRET_KEY: test_refresh_key
        run: |
          alembic upgrade head

      - name: Run tests with coverage
        working-directory: ./backend
        env:
          DATABASE_URL: postgresql+asyncpg://test_user:test_password@localhost/test_db
          REDIS_URL: redis://localhost:6379/0
          VAULT_ADDR: http://localhost:8200
          VAULT_TOKEN: test_token
          JWT_SECRET_KEY: test_secret_key
          JWT_REFRESH_SECRET_KEY: test_refresh_key
          ENVIRONMENT: test
        run: |
          pytest --cov=app --cov-report=xml --cov-report=term --cov-fail-under=75 -v

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          file: ./backend/coverage.xml
          flags: backend
          fail_ci_if_error: false

  test-frontend:
    runs-on: ubuntu-latest
    needs: [lint-frontend]

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Run tests
        working-directory: ./frontend
        run: npm test -- --coverage --watchAll=false

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          directory: ./frontend/coverage
          flags: frontend
          fail_ci_if_error: false

  # ============================================
  # SECURITY SCANNING
  # ============================================

  security-scan-backend:
    runs-on: ubuntu-latest
    needs: [test-backend]

    steps:
      - uses: actions/checkout@v4

      - name: Run Bandit (Python security)
        working-directory: ./backend
        run: |
          pip install bandit
          bandit -r app/ -f json -o bandit-report.json || true

      - name: Run Safety (dependency scan)
        working-directory: ./backend
        run: |
          pip install safety
          safety check --json > safety-report.json || true

      - name: Upload security reports
        uses: actions/upload-artifact@v4
        with:
          name: security-reports
          path: |
            backend/bandit-report.json
            backend/safety-report.json

  security-scan-frontend:
    runs-on: ubuntu-latest
    needs: [test-frontend]

    steps:
      - uses: actions/checkout@v4

      - name: Run npm audit
        working-directory: ./frontend
        run: |
          npm audit --json > npm-audit-report.json || true

      - name: Run Snyk (optional)
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
        continue-on-error: true

      - name: Upload security reports
        uses: actions/upload-artifact@v4
        with:
          name: frontend-security-reports
          path: frontend/npm-audit-report.json

  # ============================================
  # DOCKER BUILD & CONTAINER SCANNING
  # ============================================

  build-and-scan:
    runs-on: ubuntu-latest
    needs: [test-backend, test-frontend]
    if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/heads/release/') || startsWith(github.ref, 'refs/tags/v'))

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata for backend
        id: meta-backend
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME_BACKEND }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha

      - name: Extract metadata for frontend
        id: meta-frontend
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME_FRONTEND }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha

      - name: Build and push backend
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ${{ steps.meta-backend.outputs.tags }}
          labels: ${{ steps.meta-backend.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push frontend
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: ${{ steps.meta-frontend.outputs.tags }}
          labels: ${{ steps.meta-frontend.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Run Trivy vulnerability scanner (backend)
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME_BACKEND }}:${{ steps.meta-backend.outputs.version }}
          format: "sarif"
          output: "trivy-backend-results.sarif"
          severity: "CRITICAL,HIGH"

      - name: Run Trivy vulnerability scanner (frontend)
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME_FRONTEND }}:${{ steps.meta-frontend.outputs.version }}
          format: "sarif"
          output: "trivy-frontend-results.sarif"
          severity: "CRITICAL,HIGH"

      - name: Upload Trivy results to GitHub Security tab
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: "trivy-backend-results.sarif"

      - name: Upload Trivy results to GitHub Security tab
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: "trivy-frontend-results.sarif"

  # ============================================
  # DEPLOYMENT
  # ============================================

  deploy-staging:
    runs-on: ubuntu-latest
    needs: [build-and-scan]
    if: github.ref == 'refs/heads/develop'
    environment:
      name: staging
      url: https://staging.interxchange.example.com

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to staging server
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /opt/interxchange
            docker compose -f docker-compose.staging.yml pull
            docker compose -f docker-compose.staging.yml up -d --remove-orphans
            docker system prune -f

      - name: Wait for health check
        run: |
          sleep 30
          curl --fail https://staging.interxchange.example.com/health || exit 1

  deploy-production:
    runs-on: ubuntu-latest
    needs: [deploy-staging]
    if: startsWith(github.ref, 'refs/tags/v')
    environment:
      name: production
      url: https://interxchange.example.com

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to production server
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USER }}
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          script: |
            cd /opt/interxchange
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d --remove-orphans
            docker system prune -f

      - name: Wait for health check
        run: |
          sleep 30
          curl --fail https://interxchange.example.com/health || exit 1

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          name: Release ${{ github.ref_name }}
          body_path: CHANGELOG.md
          draft: false
          prerelease: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Security Scan Configuration (`.github/workflows/security-scan.yml`)

```yaml
name: Daily Security Scan

on:
  schedule:
    - cron: "0 2 * * *" # Daily at 2 AM
  workflow_dispatch: # Manual trigger

jobs:
  comprehensive-scan:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Run OWASP Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: "interxchange"
          path: "."
          format: "HTML"
          out: "reports"
          args: >
            --failOnCVSS 7
            --enableRetired

      - name: Run CodeQL Analysis
        uses: github/codeql-action/init@v3
        with:
          languages: "python, javascript"

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3

      - name: Run Gitleaks (secrets scanning)
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload all reports
        uses: actions/upload-artifact@v4
        with:
          name: security-reports
          path: |
            reports/
            gitleaks-report.json
```

---

## TASK 2: Production Docker Compose Configuration

### Production Docker Compose (`docker-compose.prod.yml`)

```yaml
version: "3.8"

networks:
  interxchange-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  vault_data:
    driver: local
  prometheus_data:
    driver: local
  grafana_data:
    driver: local
  backups:
    driver: local

services:
  # ============================================
  # POSTGRESQL DATABASE
  # ============================================
  postgres:
    image: postgres:15
    container_name: interxchange-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "5432:5432"
    networks:
      - interxchange-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: "1"
        reservations:
          memory: 1G
          cpus: "0.5"

  # ============================================
  # REDIS CACHE & BROKER
  # ============================================
  redis:
    image: redis:7-alpine
    container_name: interxchange-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - interxchange-network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "0.5"

  # ============================================
  # VAULT SECRETS MANAGEMENT
  # ============================================
  vault:
    image: vault:1.13
    container_name: interxchange-vault
    restart: unless-stopped
    cap_add:
      - IPC_LOCK
    environment:
      VAULT_ADDR: http://0.0.0.0:8200
      VAULT_API_ADDR: http://0.0.0.0:8200
      VAULT_DEV_ROOT_TOKEN_ID: ${VAULT_DEV_ROOT_TOKEN_ID}
    volumes:
      - vault_data:/vault/file
      - ./vault/config:/vault/config
      - ./vault/policies:/vault/policies
    ports:
      - "8200:8200"
    networks:
      - interxchange-network
    command: server
    healthcheck:
      test: ["CMD", "vault", "status"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # ============================================
  # BACKEND API (FASTAPI)
  # ============================================
  backend:
    image: ${REGISTRY}/interxchange-backend:${TAG:-latest}
    container_name: interxchange-backend
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres/${POSTGRES_DB}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379/0
      VAULT_ADDR: http://vault:8200
      VAULT_TOKEN: ${VAULT_TOKEN}
      JWT_SECRET_KEY: ${JWT_SECRET_KEY}
      JWT_REFRESH_SECRET_KEY: ${JWT_REFRESH_SECRET_KEY}
      ENVIRONMENT: production
      BACKEND_CORS_ORIGINS: ${BACKEND_CORS_ORIGINS}
      LOG_LEVEL: INFO
    volumes:
      - ./logs:/app/logs
    ports:
      - "8000:8000"
    networks:
      - interxchange-network
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      vault:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: "1"
        reservations:
          memory: 512M
          cpus: "0.5"

  # ============================================
  # CELERY WORKER
  # ============================================
  celery_worker:
    image: ${REGISTRY}/interxchange-backend:${TAG:-latest}
    container_name: interxchange-celery-worker
    restart: unless-stopped
    command: celery -A app.tasks.worker_app worker --loglevel=info --concurrency=4
    environment:
      DATABASE_URL: postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres/${POSTGRES_DB}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379/0
      VAULT_ADDR: http://vault:8200
      VAULT_TOKEN: ${VAULT_TOKEN}
      JWT_SECRET_KEY: ${JWT_SECRET_KEY}
      ENVIRONMENT: production
    volumes:
      - ./logs:/app/logs
    networks:
      - interxchange-network
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      vault:
        condition: service_healthy
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: "1"
        reservations:
          memory: 512M
          cpus: "0.5"

  # ============================================
  # CELERY BEAT (SCHEDULER)
  # ============================================
  celery_beat:
    image: ${REGISTRY}/interxchange-backend:${TAG:-latest}
    container_name: interxchange-celery-beat
    restart: unless-stopped
    command: celery -A app.tasks.worker_app beat --loglevel=info
    environment:
      DATABASE_URL: postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres/${POSTGRES_DB}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379/0
      VAULT_ADDR: http://vault:8200
      VAULT_TOKEN: ${VAULT_TOKEN}
      ENVIRONMENT: production
    networks:
      - interxchange-network
    depends_on:
      - postgres
      - redis
      - vault
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # ============================================
  # NGINX REVERSE PROXY (with SSL)
  # ============================================
  nginx:
    image: nginx:alpine
    container_name: interxchange-nginx
    restart: unless-stopped
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./ssl:/etc/nginx/ssl:ro
      - ./frontend/build:/usr/share/nginx/html:ro
    ports:
      - "80:80"
      - "443:443"
    networks:
      - interxchange-network
    depends_on:
      - backend
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # ============================================
  # PROMETHEUS MONITORING
  # ============================================
  prometheus:
    image: prom/prometheus:latest
    container_name: interxchange-prometheus
    restart: unless-stopped
    volumes:
      - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./monitoring/prometheus/alerts.yml:/etc/prometheus/alerts.yml:ro
      - prometheus_data:/prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.path=/prometheus"
      - "--web.console.libraries=/usr/share/prometheus/console_libraries"
      - "--web.console.templates=/usr/share/prometheus/consoles"
      - "--web.enable-lifecycle"
    ports:
      - "9090:9090"
    networks:
      - interxchange-network
    depends_on:
      - backend
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # ============================================
  # GRAFANA DASHBOARDS
  # ============================================
  grafana:
    image: grafana/grafana:latest
    container_name: interxchange-grafana
    restart: unless-stopped
    environment:
      GF_SECURITY_ADMIN_USER: ${GRAFANA_ADMIN_USER}
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_ADMIN_PASSWORD}
      GF_INSTALL_PLUGINS: grafana-piechart-panel
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning:ro
      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards:ro
    ports:
      - "3000:3000"
    networks:
      - interxchange-network
    depends_on:
      - prometheus
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # ============================================
  # POSTGRES EXPORTER (for metrics)
  # ============================================
  postgres_exporter:
    image: prometheuscommunity/postgres-exporter:latest
    container_name: interxchange-postgres-exporter
    restart: unless-stopped
    environment:
      DATA_SOURCE_NAME: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?sslmode=disable
    ports:
      - "9187:9187"
    networks:
      - interxchange-network
    depends_on:
      - postgres
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # ============================================
  # REDIS EXPORTER (for metrics)
  # ============================================
  redis_exporter:
    image: oliver006/redis_exporter:latest
    container_name: interxchange-redis-exporter
    restart: unless-stopped
    environment:
      REDIS_ADDR: redis://redis:6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
    ports:
      - "9121:9121"
    networks:
      - interxchange-network
    depends_on:
      - redis
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # ============================================
  # CADVISOR (container metrics)
  # ============================================
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    container_name: interxchange-cadvisor
    restart: unless-stopped
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
      - /dev/disk/:/dev/disk:ro
    ports:
      - "8080:8080"
    networks:
      - interxchange-network
    privileged: true
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # ============================================
  # BACKUP SERVICE
  # ============================================
  backup:
    image: postgres:15
    container_name: interxchange-backup
    restart: unless-stopped
    volumes:
      - ./backups:/backups
      - ./scripts/backup.sh:/backup.sh:ro
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
      BACKUP_SCHEDULE: "0 2 * * *" # Daily at 2 AM
      BACKUP_RETENTION_DAYS: 30
    command: >
      sh -c "
      apt-get update && apt-get install -y cron && 
      echo '$$BACKUP_SCHEDULE root /backup.sh' > /etc/crontab &&
      cron -f
      "
    networks:
      - interxchange-network
    depends_on:
      - postgres
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Nginx Configuration (`nginx/nginx.conf`)

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    multi_accept on;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main buffer=32k flush=5s;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss
               application/rss+xml application/atom+xml image/svg+xml
               application/x-font-ttf font/opentype;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    # Include server configurations
    include /etc/nginx/conf.d/*.conf;
}
```

### Nginx Server Configuration (`nginx/conf.d/interxchange.conf`)

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name interxchange.example.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name interxchange.example.com;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Frontend static files
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Rate limiting
        limit_req zone=api burst=20 nodelay;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket proxy
    location /ws {
        proxy_pass http://backend:8000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://backend:8000/health;
        access_log off;
    }

    # Metrics endpoint (internal only)
    location /metrics {
        allow 127.0.0.1;
        allow 10.0.0.0/8;
        deny all;
        proxy_pass http://backend:8000/metrics;
    }

    # Grafana dashboard (optional)
    location /grafana/ {
        proxy_pass http://grafana:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Error pages
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
}
```

---

## TASK 3: Backup & Restore Scripts

### Database Backup Script (`scripts/backup.sh`)

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/backups"
POSTGRES_USER="${POSTGRES_USER}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"
POSTGRES_DB="${POSTGRES_DB}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BACKUP_BUCKET:-}"  # Optional S3 backup

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/${POSTGRES_DB}_${TIMESTAMP}.sql.gz"

echo "Starting backup of database $POSTGRES_DB at $(date)"

# Perform backup
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -h postgres "$POSTGRES_DB" | gzip > "$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "Backup completed successfully: $BACKUP_FILE"

    # Get backup size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "Backup size: $BACKUP_SIZE"

    # Upload to S3 if configured
    if [ -n "$S3_BUCKET" ]; then
        echo "Uploading to S3 bucket: $S3_BUCKET"
        aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/backups/"

        if [ $? -eq 0 ]; then
            echo "S3 upload successful"
        else
            echo "S3 upload failed"
        fi
    fi

    # Remove old backups
    find "$BACKUP_DIR" -name "${POSTGRES_DB}_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
    echo "Removed backups older than $RETENTION_DAYS days"

else
    echo "Backup failed!"
    exit 1
fi

echo "Backup process completed at $(date)"
```

### Restore Script (`scripts/restore.sh`)

```bash
#!/bin/bash

# Usage: ./restore.sh <backup_file>

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "Restoring database from: $BACKUP_FILE"

# Drop existing connections
PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -h postgres -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$POSTGRES_DB';"

# Drop and recreate database
PGPASSWORD="$POSTGRES_PASSWORD" dropdb -U "$POSTGRES_USER" -h postgres --if-exists "$POSTGRES_DB"
PGPASSWORD="$POSTGRES_PASSWORD" createdb -U "$POSTGRES_USER" -h postgres "$POSTGRES_DB"

# Restore from backup
gunzip -c "$BACKUP_FILE" | PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -h postgres "$POSTGRES_DB"

if [ $? -eq 0 ]; then
    echo "Restore completed successfully"
else
    echo "Restore failed!"
    exit 1
fi
```

### Make scripts executable

```bash
chmod +x scripts/backup.sh
chmod +x scripts/restore.sh
```

---

## TASK 4: Environment Configuration

### Production Environment File (`.env.production`)

```bash
# ============================================
# DATABASE
# ============================================
POSTGRES_USER=interxchange
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD
POSTGRES_DB=interxchange

# ============================================
# REDIS
# ============================================
REDIS_PASSWORD=CHANGE_ME_STRONG_REDIS_PASSWORD

# ============================================
# VAULT (Production)
# ============================================
VAULT_ADDR=https://vault.interxchange.example.com:8200
VAULT_TOKEN=CHANGE_ME_VAULT_ROOT_TOKEN

# ============================================
# JWT AUTHENTICATION
# ============================================
JWT_SECRET_KEY=CHANGE_ME_32_CHARACTER_SECRET_KEY
JWT_REFRESH_SECRET_KEY=CHANGE_ME_32_CHARACTER_REFRESH_KEY

# ============================================
# CORS (Production)
# ============================================
BACKEND_CORS_ORIGINS=["https://interxchange.example.com","https://api.interxchange.example.com"]

# ============================================
# GRAFANA
# ============================================
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=CHANGE_ME_GRAFANA_PASSWORD

# ============================================
# AWS S3 Backups (Optional)
# ============================================
S3_BACKUP_BUCKET=interxchange-backups
AWS_ACCESS_KEY_ID=CHANGE_ME
AWS_SECRET_ACCESS_KEY=CHANGE_ME
AWS_REGION=us-east-1

# ============================================
# EMAIL (SMTP for notifications)
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@interxchange.example.com
SMTP_PASSWORD=CHANGE_ME
SMTP_USE_TLS=true
EMAIL_FROM=noreply@interxchange.example.com

# ============================================
# SLACK (Optional)
# ============================================
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/CHANGE_ME

# ============================================
# LOGGING
# ============================================
LOG_LEVEL=INFO
LOG_JSON_FORMAT=true

# ============================================
# PERFORMANCE
# ============================================
MAX_CONCURRENT_WORKFLOWS=5
WORKER_CONCURRENCY=4
```

---

## TASK 5: Vault Production Configuration

### Vault Configuration (`vault/config/vault.hcl`)

```hcl
# Vault configuration for production

storage "file" {
  path = "/vault/file"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = false
  tls_cert_file = "/vault/config/cert.pem"
  tls_key_file  = "/vault/config/key.pem"
}

api_addr = "https://vault.interxchange.example.com:8200"
cluster_addr = "https://vault.interxchange.example.com:8201"

seal "awskms" {
  region     = "us-east-1"
  kms_key_id = "CHANGE_ME_KMS_KEY_ID"
}

ui = true

log_level = "info"
```

### Vault Initialization Script (`scripts/vault-init.sh`)

```bash
#!/bin/bash

# Initialize Vault
vault operator init -key-shares=5 -key-threshold=3 > vault-keys.txt

# Extract unseal keys and root token
UNSEAL_KEYS=$(grep "Unseal Key" vault-keys.txt | cut -d' ' -f4)
ROOT_TOKEN=$(grep "Initial Root Token" vault-keys.txt | cut -d' ' -f4)

# Unseal Vault (need 3 keys)
for key in $(echo "$UNSEAL_KEYS" | head -3); do
    vault operator unseal $key
done

# Login with root token
vault login $ROOT_TOKEN

# Enable KV secrets engine
vault secrets enable -version=2 kv

# Create policies
cat > /vault/policies/interxchange-policy.hcl <<EOF
path "kv/data/connections/*" {
  capabilities = ["create", "read", "update", "delete"]
}
path "kv/data/system/*" {
  capabilities = ["create", "read", "update"]
}
path "kv/metadata/*" {
  capabilities = ["list"]
}
EOF

vault policy write interxchange /vault/policies/interxchange-policy.hcl

# Create AppRole for backend
vault auth enable approle

vault write auth/approle/role/interxchange \
    secret_id_ttl=24h \
    token_ttl=1h \
    token_max_ttl=4h \
    policies=interxchange

# Generate role-id and secret-id
vault read -field=role_id auth/approle/role/interxchange/role-id > role-id.txt
vault write -f -field=secret_id auth/approle/role/interxchange/secret-id > secret-id.txt

echo "Vault initialization complete"
echo "Root token: $ROOT_TOKEN"
echo "Role ID: $(cat role-id.txt)"
echo "Secret ID: $(cat secret-id.txt)"
```

---

## TASK 6: Prometheus Alerting Rules

### Alert Rules (`monitoring/prometheus/alerts.yml`)

```yaml
groups:
  - name: interxchange_alerts
    interval: 30s
    rules:
      # Service down alerts
      - alert: BackendDown
        expr: up{job="interxchange-backend"} == 0
        for: 1m
        labels:
          severity: critical
          service: backend
        annotations:
          summary: "Backend service is down"
          description: "The Interxchange backend API has been unreachable for 1 minute"

      - alert: DatabaseDown
        expr: pg_up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
          service: database
        annotations:
          summary: "PostgreSQL database is down"
          description: "The database connection has been lost"

      - alert: RedisDown
        expr: redis_up{job="redis"} == 0
        for: 1m
        labels:
          severity: critical
          service: redis
        annotations:
          summary: "Redis is down"
          description: "Redis cache/broker is unreachable"

      # Performance alerts
      - alert: HighRequestLatency
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint)) > 2
        for: 5m
        labels:
          severity: warning
          service: backend
        annotations:
          summary: "High API latency"
          description: "95th percentile request latency is {{ $value }}s for endpoint {{ $labels.endpoint }}"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
          service: backend
        annotations:
          summary: "High error rate"
          description: "Error rate is {{ $value | humanizePercentage }}"

      # Workflow alerts
      - alert: WorkflowFailed
        expr: increase(workflow_executions_total{status="failed"}[5m]) > 0
        for: 0m
        labels:
          severity: warning
          service: workflows
        annotations:
          summary: "Workflow execution failed"
          description: "Workflow {{ $labels.workflow_id }} has failed"

      - alert: WorkflowStuck
        expr: workflow_execution_duration_seconds > 1800
        for: 30m
        labels:
          severity: warning
          service: workflows
        annotations:
          summary: "Workflow execution stuck"
          description: "Workflow {{ $labels.workflow_id }} has been running for {{ $value }} seconds"

      # Resource alerts
      - alert: HighMemoryUsage
        expr: (container_memory_usage_bytes / container_spec_memory_limit_bytes) > 0.85
        for: 10m
        labels:
          severity: warning
          service: infrastructure
        annotations:
          summary: "High memory usage"
          description: "Container {{ $labels.container_name }} is using {{ $value | humanizePercentage }} of memory"

      - alert: HighCPUUsage
        expr: rate(container_cpu_usage_seconds_total[5m]) * 100 > 80
        for: 10m
        labels:
          severity: warning
          service: infrastructure
        annotations:
          summary: "High CPU usage"
          description: "Container {{ $labels.container_name }} is using {{ $value }}% CPU"

      # Database alerts
      - alert: DatabaseConnectionPoolExhausted
        expr: database_connection_pool_size > 90
        for: 5m
        labels:
          severity: warning
          service: database
        annotations:
          summary: "Database connection pool nearly exhausted"
          description: "Connection pool usage is at {{ $value }}%"

      - alert: SlowDatabaseQueries
        expr: rate(pg_stat_database_deadlocks[5m]) > 0
        for: 1m
        labels:
          severity: critical
          service: database
        annotations:
          summary: "Database deadlocks detected"
          description: "Deadlocks are occurring in the database"

      # Queue alerts
      - alert: CeleryQueueBacklog
        expr: celery_queue_size > 1000
        for: 15m
        labels:
          severity: warning
          service: celery
        annotations:
          summary: "Celery task queue backlog"
          description: "{{ $value }} tasks are pending in the queue"
```

---

## TASK 7: Deployment Scripts

### Deployment Script (`scripts/deploy.sh`)

```bash
#!/bin/bash

# Deployment script for Interxchange
set -e

# Configuration
ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker-compose.${ENVIRONMENT}.yml"
TAG=${2:-latest}

echo "Deploying Interxchange to $ENVIRONMENT environment"
echo "Using tag: $TAG"

# Pull latest images
echo "Pulling latest images..."
docker compose -f $COMPOSE_FILE pull

# Stop and remove old containers
echo "Stopping old containers..."
docker compose -f $COMPOSE_FILE down

# Backup database before migration
echo "Creating database backup..."
./scripts/backup.sh

# Run database migrations
echo "Running database migrations..."
docker compose -f $COMPOSE_FILE run --rm backend alembic upgrade head

# Start new containers
echo "Starting new containers..."
docker compose -f $COMPOSE_FILE up -d

# Wait for health check
echo "Waiting for services to be healthy..."
sleep 30

# Check health
echo "Checking health status..."
curl -f https://interxchange.example.com/health || exit 1

# Clean up old images
echo "Cleaning up old images..."
docker image prune -f

echo "Deployment completed successfully!"
```

### Rollback Script (`scripts/rollback.sh`)

```bash
#!/bin/bash

# Rollback script for Interxchange
set -e

ENVIRONMENT=${1:-production}
TAG=${2:-previous}

echo "Rolling back Interxchange to tag: $TAG"

# Stop current containers
docker compose -f docker-compose.$ENVIRONMENT.yml down

# Pull previous version
export TAG=$TAG
docker compose -f docker-compose.$ENVIRONMENT.yml pull

# Start previous version
docker compose -f docker-compose.$ENVIRONMENT.yml up -d

# Wait for health check
sleep 30

# Verify health
curl -f https://interxchange.example.com/health || exit 1

echo "Rollback completed successfully!"
```

---

## TASK 8: Monitoring & Logging Setup

### Grafana Dashboard Provisioning (`monitoring/grafana/provisioning/dashboards/dashboard.yml`)

```yaml
apiVersion: 1

providers:
  - name: "Interxchange"
    orgId: 1
    folder: ""
    type: file
    disableDeletion: false
    editable: true
    options:
      path: /var/lib/grafana/dashboards
```

### Prometheus Datasource (`monitoring/grafana/provisioning/datasources/prometheus.yml`)

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
```

---

## TASK 9: Health Check Endpoint Enhancement

### Enhanced Health Check (backend/app/api/api_v1/endpoints/health.py)

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.config import settings
import redis.asyncio as redis
import hvac

router = APIRouter()

@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Enhanced health check endpoint"""
    status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {}
    }

    # Check database
    try:
        await db.execute("SELECT 1")
        status["services"]["database"] = {"status": "healthy"}
    except Exception as e:
        status["services"]["database"] = {"status": "unhealthy", "error": str(e)}
        status["status"] = "degraded"

    # Check Redis
    try:
        redis_client = redis.from_url(settings.REDIS_URL)
        await redis_client.ping()
        await redis_client.close()
        status["services"]["redis"] = {"status": "healthy"}
    except Exception as e:
        status["services"]["redis"] = {"status": "unhealthy", "error": str(e)}
        status["status"] = "degraded"

    # Check Vault
    try:
        vault_client = hvac.Client(url=settings.VAULT_ADDR, token=settings.VAULT_TOKEN)
        if vault_client.is_authenticated():
            status["services"]["vault"] = {"status": "healthy"}
        else:
            status["services"]["vault"] = {"status": "unhealthy", "error": "Not authenticated"}
    except Exception as e:
        status["services"]["vault"] = {"status": "unhealthy", "error": str(e)}
        status["status"] = "degraded"

    # Check Celery
    try:
        from app.tasks.health_tasks import health_check_task
        result = health_check_task.delay()
        result.get(timeout=5)
        status["services"]["celery"] = {"status": "healthy"}
    except Exception as e:
        status["services"]["celery"] = {"status": "unhealthy", "error": str(e)}
        status["status"] = "degraded"

    # Determine overall status
    if any(s["status"] != "healthy" for s in status["services"].values()):
        status["status"] = "degraded"

    return status
```

---

## DELIVERABLES CHECKLIST

Before considering Phase 6 complete, ensure all items below are implemented:

### CI/CD Pipeline

- [ ] GitHub Actions workflow with linting, testing, building
- [ ] Security scanning (Trivy, Bandit, Safety, npm audit)
- [ ] Docker image building and pushing to registry
- [ ] Automated deployment to staging and production
- [ ] Health check verification after deployment
- [ ] Daily security scan schedule

### Production Configuration

- [ ] Production Docker Compose with all services
- [ ] Nginx reverse proxy with SSL/TLS
- [ ] Environment configuration (.env.production)
- [ ] Resource limits and health checks for all containers
- [ ] Logging configuration with rotation

### Vault Setup

- [ ] Vault production configuration file
- [ ] Vault initialization script
- [ ] AppRole authentication configuration
- [ ] KV secrets engine enabled
- [ ] Backup and recovery procedures

### Backup & Recovery

- [ ] Automated database backup script
- [ ] S3 backup integration (optional)
- [ ] Restore script for disaster recovery
- [ ] Cron job configuration for scheduled backups
- [ ] Backup retention policy (30 days)

### Monitoring & Alerting

- [ ] Prometheus configuration with scrape jobs
- [ ] Alert rules for critical conditions
- [ ] Grafana dashboard provisioning
- [ ] Postgres exporter for database metrics
- [ ] Redis exporter for cache metrics
- [ ] cAdvisor for container metrics

### Deployment Scripts

- [ ] Deploy script with migrations
- [ ] Rollback script
- [ ] Health check verification
- [ ] Blue-green deployment ready

### Documentation

- [ ] Deployment guide (docs/deployment.md)
- [ ] Disaster recovery procedures
- [ ] Scaling guide
- [ ] Troubleshooting guide
- [ ] Runbook for common issues

---

## NOTES FOR GEMINI

1. **Security is paramount** - Never hardcode secrets; use environment variables or Vault
2. **High availability** - Configure for multiple replicas where possible
3. **Monitoring** - Ensure all critical services have health checks and alerts
4. **Backup testing** - Regularly test restore procedures
5. **Rollback strategy** - Ensure quick rollback capability
6. **Documentation** - Keep deployment docs updated with each change
7. **Secrets rotation** - Document procedures for rotating all secrets

---

**Begin Phase 6 implementation now. Provide configuration files, scripts, and documentation in your response. After completing each major component, indicate progress and ask for feedback if needed.**
