# SchoolOS Engineering Roadmap

A hands-on engineering roadmap that extends the SchoolOS school management system with real features while building deep experience across backend engineering, platform infrastructure, systems design, and AI engineering.

**Current Stack:** NestJS (TypeScript) monolith + Next.js frontend monorepo + PostgreSQL + Prisma ORM

**Target Architecture:** Event-driven microservices with a NestJS core, Golang high-performance services, Python ML/AI services, deployed on AWS with Kubernetes.

---

## Table of Contents

1. [Phase 1 — Containerization & CI/CD](#phase-1--containerization--cicd)
2. [Phase 2 — Notification & Messaging Service](#phase-2--notification--messaging-service)
3. [Phase 3 — Infrastructure as Code & Kubernetes](#phase-3--infrastructure-as-code--kubernetes)
4. [Phase 4 — Observability Stack](#phase-4--observability-stack)
5. [Phase 5 — Report Card & PDF Generation Service](#phase-5--report-card--pdf-generation-service)
6. [Phase 6 — Student Analytics & Early Warning System](#phase-6--student-analytics--early-warning-system)
7. [Phase 7 — AI Teaching Assistant](#phase-7--ai-teaching-assistant)
8. [Phase 8 — Timetable Generation Engine](#phase-8--timetable-generation-engine)
9. [Architecture Overview](#architecture-overview)
10. [Skills Matrix](#skills-matrix)

---

## Phase 1 — Containerization & CI/CD

### The Problem

The system currently runs with `npm run start:dev` locally. There is no standardized way to build, test, or deploy. Every environment is a snowflake. Moving to multiple services later is impossible without this foundation.

### What to Build

#### 1.1 Dockerize the Backend

Create a multi-stage Dockerfile for the NestJS backend:

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

Key considerations:
- Use `.dockerignore` to exclude `node_modules`, `.git`, `test/`, `docs/`
- Pin base image versions for reproducibility
- Run as non-root user in production stage
- Keep the final image under 200MB

#### 1.2 Dockerize the Frontend

Multi-stage build for the Next.js admin portal:
- Stage 1: Install dependencies and build with `next build` (standalone output)
- Stage 2: Copy only the standalone output + static assets
- Handle environment variables at runtime, not build time (use `NEXT_PUBLIC_*` pattern)

#### 1.3 Docker Compose for Local Development

Create a `docker-compose.yml` that spins up the full local environment:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: schoolos
      POSTGRES_USER: schoolos
      POSTGRES_PASSWORD: localdev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build:
      context: ./schoolos-backend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://schoolos:localdev@postgres:5432/schoolos
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./schoolos-backend:/app
      - /app/node_modules

  admin-portal:
    build:
      context: ./schoolos-frontend
      dockerfile: apps/admin-portal/Dockerfile.dev
    ports:
      - "3001:3000"
    depends_on:
      - backend

volumes:
  pgdata:
```

#### 1.4 GitHub Actions CI Pipeline

Create `.github/workflows/ci.yml`:

```
Trigger: push to main, pull requests

Jobs:
  lint:
    - Checkout
    - Setup Node 20
    - Install dependencies
    - Run ESLint on backend
    - Run ESLint on frontend

  test-backend:
    - Checkout
    - Setup Node 20
    - Start PostgreSQL service container
    - Install dependencies
    - Run Prisma migrations
    - Run unit tests
    - Run e2e tests
    - Upload coverage report

  test-frontend:
    - Checkout
    - Setup Node 20
    - Install dependencies
    - Run type checking (tsc --noEmit)
    - Run unit tests (if any)

  build:
    needs: [lint, test-backend, test-frontend]
    - Build backend Docker image
    - Build frontend Docker image
    - Push to Amazon ECR (on main branch only)
    - Tag with git SHA + "latest"
```

### Skills Practiced

| Skill | How |
|-------|-----|
| Docker | Multi-stage builds, layer caching, image optimization |
| CI/CD | GitHub Actions workflows, service containers, caching strategies |
| Linux | Alpine-based images, process management, file permissions |
| Security | Non-root containers, secret handling, image scanning |

### Definition of Done

- [ ] `docker compose up` starts the entire system from scratch in under 2 minutes
- [ ] CI pipeline runs on every PR, blocks merge on failure
- [ ] Docker images are pushed to ECR on merge to main
- [ ] Backend image is under 200MB, frontend under 150MB

---

## Phase 2 — Notification & Messaging Service

### The Problem

When a teacher publishes scores, parents have no idea. When attendance is marked and a student is absent, nobody is alerted. When fees are due, there is no automated reminder. Currently, all these events happen silently in the database.

### What to Build

A standalone Golang microservice that consumes events from the NestJS backend and delivers notifications via multiple channels (email, SMS, in-app push).

#### 2.1 Event System in NestJS

Add an event bus to the existing NestJS backend. Use Redis Streams as the message broker (simple, persistent, supports consumer groups).

Define domain events:

```typescript
// Domain events emitted by NestJS
interface ScoresPublishedEvent {
  type: 'scores.published';
  payload: {
    subjectId: string;
    subjectName: string;
    classArmId: string;
    classArmName: string;
    termId: string;
    termName: string;
    teacherId: string;
    teacherName: string;
    studentCount: number;
    timestamp: string;
  };
}

interface AttendanceMarkedEvent {
  type: 'attendance.marked';
  payload: {
    classArmId: string;
    date: string;
    absentStudentIds: string[];
    lateStudentIds: string[];
  };
}

interface FeeReminderEvent {
  type: 'fee.reminder';
  payload: {
    studentIds: string[];
    feeType: string;
    amount: number;
    dueDate: string;
  };
}
```

Emit events after key operations:
- After teacher submits/publishes scores → `scores.published`
- After attendance is saved → `attendance.marked`
- Scheduled cron job for fee reminders → `fee.reminder`

#### 2.2 Golang Notification Service

**Project structure:**

```
notification-service/
  cmd/
    server/
      main.go            # Entry point
  internal/
    config/
      config.go          # Environment config loading
    consumer/
      redis_consumer.go  # Redis Streams consumer
      handler.go         # Event routing to handlers
    handlers/
      scores.go          # Handle scores.published
      attendance.go      # Handle attendance.marked
      fees.go            # Handle fee.reminder
    delivery/
      email.go           # Email delivery (SES)
      sms.go             # SMS delivery (Twilio/Africa's Talking)
      push.go            # Push notification delivery
    models/
      event.go           # Event type definitions
      notification.go    # Notification model
    store/
      postgres.go        # Notification log storage
    worker/
      pool.go            # Worker pool for concurrent delivery
  go.mod
  go.sum
  Dockerfile
```

**Key design decisions:**

- **Worker pool pattern:** Use a bounded pool of goroutines (e.g., 50 workers) to process notifications concurrently without overwhelming external APIs
- **Retry with backoff:** If SMS delivery fails, retry 3 times with exponential backoff (1s, 5s, 30s)
- **Dead letter queue:** After max retries, move to a dead letter stream for manual inspection
- **Delivery log:** Store every notification attempt in PostgreSQL for audit (who was notified, when, via what channel, success/failure)
- **Rate limiting:** Respect SMS provider rate limits (e.g., 30 msgs/second for Africa's Talking)

**Consumer group pattern with Redis Streams:**

```go
// Consumer reads from Redis Stream using consumer groups
// This means multiple instances of the service can run
// and each event is processed exactly once
func (c *Consumer) Start(ctx context.Context) error {
    // Create consumer group if not exists
    // XGROUP CREATE events notification-service $ MKSTREAM

    for {
        // XREADGROUP GROUP notification-service worker-1
        //   COUNT 10 BLOCK 5000 STREAMS events >
        entries, err := c.client.XReadGroup(ctx, &redis.XReadGroupArgs{
            Group:    "notification-service",
            Consumer: c.consumerID,
            Streams:  []string{"events", ">"},
            Count:    10,
            Block:    5 * time.Second,
        }).Result()

        for _, entry := range entries {
            c.handler.Handle(ctx, entry)
            // XACK after successful processing
            c.client.XAck(ctx, "events", "notification-service", entry.ID)
        }
    }
}
```

**Concurrency with worker pool:**

```go
type WorkerPool struct {
    jobs    chan DeliveryJob
    results chan DeliveryResult
    wg      sync.WaitGroup
}

func NewWorkerPool(size int) *WorkerPool {
    pool := &WorkerPool{
        jobs:    make(chan DeliveryJob, 1000),
        results: make(chan DeliveryResult, 1000),
    }
    for i := 0; i < size; i++ {
        pool.wg.Add(1)
        go pool.worker(i)
    }
    return pool
}

func (p *WorkerPool) worker(id int) {
    defer p.wg.Done()
    for job := range p.jobs {
        result := job.Deliver() // Send email/SMS/push
        p.results <- result
    }
}
```

#### 2.3 Notification Preferences

Add a `notification_preferences` table to PostgreSQL:

```sql
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    channel VARCHAR(20) NOT NULL, -- 'email', 'sms', 'push'
    event_type VARCHAR(50) NOT NULL, -- 'scores.published', 'attendance.marked'
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, channel, event_type)
);
```

The Go service checks preferences before delivering: if a parent disabled SMS for score notifications, skip that channel.

#### 2.4 REST API for Notification History

The Go service also exposes a simple REST API (Gin or Fiber):

```
GET  /api/notifications?userId={id}&page=1&limit=20
     → List notifications for a user (in-app notification bell)

POST /api/notifications/{id}/read
     → Mark notification as read

GET  /api/notifications/unread-count?userId={id}
     → Badge count for notification bell
```

### Skills Practiced

| Skill | How |
|-------|-----|
| Golang (Gin/Fiber) | REST API, project structure, error handling |
| Event-driven architecture | Redis Streams, consumer groups, event schemas |
| Concurrency | Goroutines, worker pools, channels, sync primitives |
| Async systems | Fire-and-forget from NestJS, eventual delivery |
| Networking | HTTP clients for external APIs (SES, Twilio) |
| Docker | Containerize the Go service |
| Security | API key management for SMS/email providers |

### Definition of Done

- [ ] Teacher publishes scores → parents receive SMS within 30 seconds
- [ ] Student marked absent → parent notified via preferred channel
- [ ] Notification bell in admin/teacher portal shows unread count
- [ ] Service handles 1000 notifications/minute without dropping messages
- [ ] Dead letter queue captures failed deliveries for retry

---

## Phase 3 — Infrastructure as Code & Kubernetes

### The Problem

You now have three things to deploy: NestJS backend, Next.js frontend, and Go notification service — plus PostgreSQL and Redis. Managing this manually on AWS is error-prone and unrepeatable.

### What to Build

#### 3.1 Terraform AWS Infrastructure

**Project structure:**

```
infrastructure/
  terraform/
    environments/
      staging/
        main.tf
        variables.tf
        terraform.tfvars
      production/
        main.tf
        variables.tf
        terraform.tfvars
    modules/
      networking/
        main.tf          # VPC, subnets, NAT gateway, security groups
        variables.tf
        outputs.tf
      eks/
        main.tf          # EKS cluster, node groups, IRSA
        variables.tf
        outputs.tf
      rds/
        main.tf          # PostgreSQL RDS instance, parameter groups
        variables.tf
        outputs.tf
      elasticache/
        main.tf          # Redis ElastiCache cluster
        variables.tf
        outputs.tf
      ecr/
        main.tf          # Container registries for each service
        variables.tf
        outputs.tf
      s3/
        main.tf          # Buckets for PDFs, uploads, static assets
        variables.tf
        outputs.tf
```

**Networking module provisions:**
- VPC with 3 public subnets + 3 private subnets across AZs
- NAT Gateway for private subnet internet access
- Security groups: RDS only accessible from EKS, Redis only from EKS
- No database exposed to the internet

**EKS module provisions:**
- Managed Kubernetes cluster (v1.29+)
- Managed node group: 2-5 t3.medium instances with autoscaling
- IRSA (IAM Roles for Service Accounts) so pods can assume AWS roles without static credentials
- AWS Load Balancer Controller for ingress
- EBS CSI driver for persistent volumes

**RDS module provisions:**
- PostgreSQL 16 on db.t3.medium
- Multi-AZ for production, single-AZ for staging
- Automated backups with 7-day retention
- Encrypted at rest with AWS KMS
- Parameter group tuning: `shared_buffers`, `work_mem`, `max_connections`

**State management:**
- Store Terraform state in S3 with DynamoDB locking
- Separate state files per environment

#### 3.2 Kubernetes Manifests

**Structure:**

```
infrastructure/
  k8s/
    base/
      namespace.yaml
      backend/
        deployment.yaml
        service.yaml
        hpa.yaml
        configmap.yaml
      frontend/
        deployment.yaml
        service.yaml
      notification-service/
        deployment.yaml
        service.yaml
        hpa.yaml
      ingress.yaml
    overlays/
      staging/
        kustomization.yaml
        patches/
      production/
        kustomization.yaml
        patches/
```

**Backend deployment example:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: schoolos-backend
  namespace: schoolos
spec:
  replicas: 2
  selector:
    matchLabels:
      app: schoolos-backend
  template:
    metadata:
      labels:
        app: schoolos-backend
    spec:
      serviceAccountName: schoolos-backend  # IRSA
      containers:
        - name: backend
          image: <account>.dkr.ecr.<region>.amazonaws.com/schoolos-backend:latest
          ports:
            - containerPort: 3000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: schoolos-secrets
                  key: database-url
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: schoolos-secrets
                  key: redis-url
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
```

**Horizontal Pod Autoscaler for the notification service:**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: notification-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: notification-service
  minReplicas: 1
  maxReplicas: 5
  metrics:
    - type: Pods
      pods:
        metric:
          name: redis_stream_pending_messages
        target:
          type: AverageValue
          averageValue: "100"
```

**Ingress routing:**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: schoolos-ingress
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/certificate-arn: <acm-cert-arn>
spec:
  rules:
    - host: api.schoolos.app
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: schoolos-backend
                port:
                  number: 3000
          - path: /notifications
            pathType: Prefix
            backend:
              service:
                name: notification-service
                port:
                  number: 8080
    - host: admin.schoolos.app
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: admin-portal
                port:
                  number: 3000
```

#### 3.3 Secrets Management

- Use AWS Secrets Manager to store database credentials, API keys, JWT secrets
- Use External Secrets Operator in K8s to sync AWS secrets into K8s secrets
- Never store secrets in Terraform state, git, or environment files

#### 3.4 GitHub Actions CD Pipeline

Extend the CI pipeline from Phase 1:

```
deploy-staging:
  needs: [build]
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'
  steps:
    - Configure AWS credentials (OIDC, not static keys)
    - Login to ECR
    - Update K8s deployment image tag to new SHA
    - kubectl apply -k infrastructure/k8s/overlays/staging
    - Wait for rollout to complete
    - Run smoke tests against staging URL

deploy-production:
  needs: [deploy-staging]
  runs-on: ubuntu-latest
  environment: production  # Requires manual approval in GitHub
  steps:
    - Same as staging but targeting production overlay
```

### Skills Practiced

| Skill | How |
|-------|-----|
| Terraform | Modules, state management, environments, AWS provider |
| AWS | VPC, EKS, RDS, ElastiCache, ECR, S3, IAM, Secrets Manager |
| Kubernetes | Deployments, Services, Ingress, HPA, ConfigMaps, Secrets, Kustomize |
| Networking | VPC design, subnet routing, security groups, DNS, TLS |
| CI/CD | Multi-stage pipelines, environment promotion, manual approvals |
| Security | IRSA, OIDC for GitHub, encrypted storage, network isolation |

### Definition of Done

- [ ] `terraform apply` provisions the entire AWS infrastructure from scratch
- [ ] `kubectl apply -k overlays/staging` deploys all services
- [ ] Merge to main automatically deploys to staging
- [ ] Production deployment requires manual approval
- [ ] Zero secrets in source code or Terraform state
- [ ] Database is not accessible from the internet

---

## Phase 4 — Observability Stack

### The Problem

With multiple services running in Kubernetes, you are blind. When a parent complains "I didn't get my child's scores notification", you have no way to trace what happened. When the system is slow, you don't know which service or query is the bottleneck.

### What to Build

#### 4.1 OpenTelemetry Instrumentation

**NestJS Backend:**

```typescript
// tracing.ts — initialize before app bootstrap
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'http://otel-collector:4318/v1/traces',
  }),
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    new NestInstrumentation(),
    new PrismaInstrumentation(),
  ],
});

sdk.start();
```

This automatically traces every HTTP request through NestJS controllers, services, and down to individual Prisma queries. You can see exactly which database query is slow.

**Golang Notification Service:**

```go
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
    "go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
)

// Add middleware to Gin
router.Use(otelgin.Middleware("notification-service"))

// Create spans for business logic
func (h *ScoresHandler) Handle(ctx context.Context, event ScoresPublishedEvent) {
    ctx, span := otel.Tracer("notification-service").Start(ctx, "handle-scores-published")
    defer span.End()

    span.SetAttributes(
        attribute.String("subject", event.Payload.SubjectName),
        attribute.Int("student_count", event.Payload.StudentCount),
    )

    // Process notifications...
}
```

**Python Analytics Service (Phase 6):**

```python
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

FastAPIInstrumentor.instrument_app(app)
SQLAlchemyInstrumentor().instrument(engine=engine)
```

**Trace context propagation:** When NestJS emits an event to Redis, include the trace ID in the event payload. The Go consumer extracts it and continues the trace. This creates a single trace that spans: `HTTP request → NestJS processing → Redis publish → Go consumer → SMS delivery`.

#### 4.2 Prometheus Metrics

**Metrics to expose from each service:**

NestJS:
- `http_request_duration_seconds` (histogram, labels: method, route, status)
- `http_requests_total` (counter, labels: method, route, status)
- `prisma_query_duration_seconds` (histogram, labels: model, operation)
- `active_websocket_connections` (gauge)

Go Notification Service:
- `notifications_sent_total` (counter, labels: channel, event_type, status)
- `notification_delivery_duration_seconds` (histogram, labels: channel)
- `redis_stream_pending_messages` (gauge)
- `redis_stream_lag_seconds` (gauge)
- `worker_pool_active_workers` (gauge)
- `dead_letter_queue_size` (gauge)

Python Analytics Service:
- `prediction_duration_seconds` (histogram, labels: model_name)
- `predictions_total` (counter, labels: model_name, result)

**Deploy Prometheus in K8s:**

```yaml
# Use kube-prometheus-stack Helm chart
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false
```

Add ServiceMonitor for each service:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: schoolos-backend
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: schoolos-backend
  endpoints:
    - port: metrics
      path: /metrics
      interval: 15s
```

#### 4.3 Grafana Dashboards

**Dashboard 1: System Overview**
- Total requests/second across all services
- Error rate (5xx) per service
- P50, P95, P99 latency per service
- Active pods per deployment
- CPU and memory usage per service

**Dashboard 2: Notification Service**
- Notifications sent per minute (by channel)
- Delivery success rate
- Redis stream pending messages (indicates backlog)
- Average delivery latency (time from event to delivery)
- Dead letter queue size (alerts if > 0)

**Dashboard 3: Database Performance**
- Query duration by model/operation (from Prisma instrumentation)
- Active connections vs max connections
- Slow queries (> 500ms)
- Connection pool utilization

**Dashboard 4: Business Metrics**
- Active users per portal (admin, teacher, student)
- Scores submitted today
- Attendance marking rate
- Report cards generated this week

#### 4.4 Alerting Rules

```yaml
# Prometheus alerting rules
groups:
  - name: schoolos-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Error rate above 5% for {{ $labels.service }}"

      - alert: NotificationBacklog
        expr: redis_stream_pending_messages > 500
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Notification queue has {{ $value }} pending messages"

      - alert: SlowDatabaseQueries
        expr: histogram_quantile(0.95, prisma_query_duration_seconds_bucket) > 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "P95 database query time is {{ $value }}s"
```

### Concrete Scenario

Teacher uploads bulk scores via Excel for 40 students. You can trace:

```
[Trace: abc123]
├── POST /api/bff/teacher/scores/bulk-upload (NestJS, 2.3s)
│   ├── ParseExcelFile (45ms)
│   ├── prisma.subjectTerm.findFirst (12ms)
│   ├── prisma.subjectTermStudent.findMany (23ms)
│   ├── prisma.$transaction — create 40 assessments (890ms)  ← bottleneck identified
│   └── redis.xadd("events", "scores.published") (3ms)
├── [async] notification-service: handle-scores-published (1.2s)
│   ├── fetch-parent-contacts (89ms)
│   ├── check-notification-preferences (12ms)
│   ├── worker-pool: deliver 35 SMS (1.1s, 5 parents opted out)
│   │   ├── sms-delivery student-001 (120ms) ✓
│   │   ├── sms-delivery student-002 (95ms) ✓
│   │   ├── sms-delivery student-003 (340ms) ✗ → retry queued
│   │   └── ... 32 more
│   └── store-delivery-log (23ms)
```

### Skills Practiced

| Skill | How |
|-------|-----|
| OpenTelemetry | Distributed tracing across 3 languages/services |
| Prometheus | Custom metrics, PromQL queries, service discovery |
| Grafana | Dashboard design, variable templates, alerting |
| Observability | The three pillars: traces, metrics, logs |
| Networking | Understanding latency across service boundaries |
| Systems design | Identifying bottlenecks, capacity planning |

### Definition of Done

- [ ] Single trace visible across NestJS → Redis → Go notification service
- [ ] Grafana dashboards show real-time system health
- [ ] Alerts fire within 5 minutes of an incident
- [ ] Can answer "why was this notification not delivered?" using traces
- [ ] Can identify the slowest database queries in the last hour

---

## Phase 5 — Report Card & PDF Generation Service

### The Problem

At the end of every term, schools need to generate personalized report cards for every student — often hundreds at once. Each report card includes student info, scores for every subject, teacher comments, principal's remarks, attendance summary, and school branding. The current broadsheet Excel is useful for teachers but parents need formatted PDFs.

### What to Build

A Golang microservice that generates PDF report cards at scale using concurrent processing.

#### 5.1 Report Card Data Contract

The NestJS backend provides report card data via an internal API:

```json
{
  "student": {
    "name": "Tudonu David",
    "studentNo": "KCL/S/25/0001",
    "class": "JSS 2 Ruby",
    "gender": "Male",
    "avatarUrl": "..."
  },
  "school": {
    "name": "Kings College Lagos",
    "logo": "https://...",
    "address": "..."
  },
  "session": "2027-2028",
  "term": "First Term",
  "subjects": [
    {
      "name": "Mathematics",
      "assessments": { "Assignment": 10, "Note": 9, "CA": 18, "Exam": 50 },
      "total": 87,
      "grade": "A",
      "position": 1,
      "classAverage": 72.5,
      "teacherRemark": "Excellent performance"
    }
  ],
  "attendance": { "daysPresent": 58, "totalDays": 65 },
  "overallAverage": 78.5,
  "overallGrade": "A",
  "classPosition": 3,
  "totalInClass": 45,
  "principalRemark": "Keep up the good work",
  "nextTermBegins": "2028-01-15"
}
```

#### 5.2 Golang Service Architecture

```
report-service/
  cmd/
    server/
      main.go
  internal/
    config/
      config.go
    api/
      router.go
      handlers.go
      middleware.go
    generator/
      pdf.go           # PDF generation using chromedp (HTML → PDF)
      template.go      # HTML template rendering
      worker_pool.go   # Concurrent generation
    templates/
      report-card.html # Go template for report card layout
      broadsheet.html  # Go template for broadsheet
    storage/
      s3.go            # Upload to S3, generate presigned URLs
    models/
      report.go
  Dockerfile
```

**API endpoints:**

```
POST /api/reports/generate
  Body: { studentIds: [...], sessionId, termId }
  Response: { jobId: "uuid" }
  → Queues a batch generation job

GET /api/reports/jobs/{jobId}
  Response: { status: "processing", progress: 45, total: 120 }
  → Check job progress

GET /api/reports/jobs/{jobId}/download
  Response: 302 → presigned S3 URL to ZIP file
  → Download when complete

POST /api/reports/generate-single
  Body: { studentId, sessionId, termId }
  Response: application/pdf (streaming)
  → Generate and return immediately for single student preview
```

**Worker pool for batch generation:**

```go
func (g *Generator) GenerateBatch(ctx context.Context, job BatchJob) {
    ctx, span := otel.Tracer("report-service").Start(ctx, "generate-batch")
    defer span.End()

    results := make(chan GenerationResult, len(job.StudentIDs))
    semaphore := make(chan struct{}, 10) // Max 10 concurrent Chrome instances

    var wg sync.WaitGroup
    for _, studentID := range job.StudentIDs {
        wg.Add(1)
        go func(sid string) {
            defer wg.Done()
            semaphore <- struct{}{}        // Acquire
            defer func() { <-semaphore }() // Release

            pdf, err := g.generateSingle(ctx, sid, job.SessionID, job.TermID)
            results <- GenerationResult{StudentID: sid, PDF: pdf, Error: err}
        }(studentID)
    }

    // Collect results, create ZIP, upload to S3
    go func() {
        wg.Wait()
        close(results)
    }()

    var pdfs []NamedPDF
    for result := range results {
        if result.Error != nil {
            span.RecordError(result.Error)
            continue
        }
        pdfs = append(pdfs, NamedPDF{
            Name: fmt.Sprintf("%s-report-card.pdf", result.StudentID),
            Data: result.PDF,
        })
        g.updateProgress(job.ID) // Increment progress counter
    }

    zipBuffer := g.createZIP(pdfs)
    url, _ := g.storage.Upload(ctx, job.ID+".zip", zipBuffer)
    g.completeJob(job.ID, url)
}
```

#### 5.3 HTML-to-PDF with chromedp

Use headless Chrome for high-fidelity PDF rendering:

```go
func (g *Generator) renderPDF(ctx context.Context, html string) ([]byte, error) {
    ctx, cancel := chromedp.NewContext(ctx)
    defer cancel()

    var buf []byte
    err := chromedp.Run(ctx,
        chromedp.Navigate("about:blank"),
        chromedp.ActionFunc(func(ctx context.Context) error {
            frameTree, _ := page.GetFrameTree().Do(ctx)
            page.SetDocumentContent(frameTree.Frame.ID, html).Do(ctx)
            return nil
        }),
        chromedp.WaitReady("body"),
        chromedp.ActionFunc(func(ctx context.Context) error {
            var err error
            buf, _, err = page.PrintToPDF().
                WithPaperWidth(8.27).   // A4
                WithPaperHeight(11.69). // A4
                WithMarginTop(0.4).
                WithMarginBottom(0.4).
                WithPrintBackground(true).
                Do(ctx)
            return err
        }),
    )

    return buf, err
}
```

#### 5.4 S3 Integration

```go
func (s *S3Storage) Upload(ctx context.Context, key string, data []byte) (string, error) {
    _, err := s.client.PutObject(ctx, &s3.PutObjectInput{
        Bucket:      aws.String(s.bucket),
        Key:         aws.String("reports/" + key),
        Body:        bytes.NewReader(data),
        ContentType: aws.String("application/zip"),
    })
    if err != nil {
        return "", err
    }

    // Generate presigned URL valid for 24 hours
    presigner := s3.NewPresignClient(s.client)
    req, _ := presigner.PresignGetObject(ctx, &s3.GetObjectInput{
        Bucket: aws.String(s.bucket),
        Key:    aws.String("reports/" + key),
    }, func(opts *s3.PresignOptions) {
        opts.Expires = 24 * time.Hour
    })

    return req.URL, nil
}
```

### Skills Practiced

| Skill | How |
|-------|-----|
| Golang | HTTP server, templates, concurrency patterns |
| Concurrency | Worker pools, semaphores, channels, sync.WaitGroup |
| AWS S3 | Uploads, presigned URLs, lifecycle policies |
| Docker | Multi-stage build with headless Chrome |
| Systems design | Batch processing, job queues, progress tracking |
| Networking | Internal service-to-service API calls |

### Definition of Done

- [ ] Single report card generates in under 3 seconds
- [ ] Batch of 200 report cards generates in under 2 minutes
- [ ] Admin can track progress of batch generation
- [ ] Generated PDFs are stored in S3 with 30-day expiry
- [ ] Report card matches school branding (logo, colors, layout)

---

## Phase 6 — Student Analytics & Early Warning System

### The Problem

Teachers and admins currently see raw scores. They have no way to answer: "Which students are declining?" "Who is likely to fail this term?" "How does this class compare to others?" Schools catch struggling students too late — after they've already failed.

### What to Build

A Python FastAPI microservice that analyzes student performance data and provides predictions, trends, and alerts.

#### 6.1 Project Structure

```
analytics-service/
  app/
    main.py              # FastAPI app
    config.py            # Settings
    api/
      routes/
        students.py      # Student analytics endpoints
        classes.py       # Class analytics endpoints
        predictions.py   # ML prediction endpoints
      dependencies.py    # DB session, auth
    models/
      schemas.py         # Pydantic models
      database.py        # SQLAlchemy models (read-only views)
    services/
      trend_analysis.py  # Score trend calculations
      risk_detection.py  # At-risk student detection
      comparison.py      # Class/subject comparisons
    ml/
      features.py        # Feature engineering
      training.py        # Model training pipeline
      predictor.py       # Inference
      models/            # Saved model files (.joblib)
    db/
      connection.py      # Read-only PostgreSQL connection
  tests/
  requirements.txt
  Dockerfile
```

#### 6.2 Feature Engineering

Build meaningful features from the raw SchoolOS data:

```python
class StudentFeatures:
    """Features computed for each student to feed into ML models."""

    def compute(self, student_id: str, session_id: str) -> dict:
        return {
            # Score-based features
            "current_term_average": 72.5,
            "previous_term_average": 68.0,
            "score_trend": 4.5,                  # Current - previous (positive = improving)
            "score_volatility": 12.3,             # Std dev of scores across subjects
            "subjects_below_50": 2,               # Number of failing subjects
            "subjects_declining": 3,              # Subjects where score dropped vs last term
            "worst_subject_score": 35.0,
            "best_subject_score": 92.0,

            # Assessment completion features
            "missing_assessments_pct": 0.15,      # % of assessments not submitted
            "late_submissions_pct": 0.08,

            # Relative performance features
            "percentile_in_class": 65,            # Where they rank in class (0-100)
            "deviation_from_class_avg": -5.2,     # How far from class average
            "deviation_from_subject_avg": -3.1,   # Per-subject deviation

            # Historical features
            "terms_enrolled": 3,
            "improvement_rate": 2.1,              # Average term-over-term change
            "consecutive_declining_terms": 0,
        }
```

#### 6.3 Risk Detection Model

```python
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import cross_val_score
from sklearn.metrics import classification_report
import joblib

class RiskDetectionModel:
    """Predicts whether a student is at risk of failing."""

    def __init__(self):
        self.model = GradientBoostingClassifier(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.1,
            min_samples_leaf=10,
        )
        self.feature_names = [
            "current_term_average",
            "score_trend",
            "score_volatility",
            "subjects_below_50",
            "subjects_declining",
            "missing_assessments_pct",
            "percentile_in_class",
            "deviation_from_class_avg",
            "consecutive_declining_terms",
            "improvement_rate",
        ]

    def train(self, features: np.ndarray, labels: np.ndarray):
        """
        Labels:
          0 = student passed end-of-year
          1 = student failed end-of-year

        Train on historical data: use Term 1 features to predict
        end-of-year outcome. This way, during Term 1, we can
        predict who will struggle by year end.
        """
        scores = cross_val_score(self.model, features, labels, cv=5, scoring='f1')
        print(f"Cross-validation F1: {scores.mean():.3f} (+/- {scores.std():.3f})")

        self.model.fit(features, labels)
        joblib.dump(self.model, "ml/models/risk_model.joblib")

    def predict(self, features: dict) -> dict:
        """Returns risk score and contributing factors."""
        X = np.array([[features[f] for f in self.feature_names]])
        probability = self.model.predict_proba(X)[0][1]  # Probability of class 1 (at-risk)

        # Feature importance for explainability
        importances = self.model.feature_importances_
        top_factors = sorted(
            zip(self.feature_names, importances, X[0]),
            key=lambda x: x[1],
            reverse=True,
        )[:3]

        return {
            "risk_score": round(probability * 100, 1),  # 0-100
            "risk_level": "high" if probability > 0.7 else "medium" if probability > 0.4 else "low",
            "contributing_factors": [
                {
                    "factor": name,
                    "importance": round(imp * 100, 1),
                    "value": round(val, 1),
                    "explanation": self._explain_factor(name, val),
                }
                for name, imp, val in top_factors
            ],
        }

    def _explain_factor(self, name: str, value: float) -> str:
        explanations = {
            "score_trend": f"Scores {'improving' if value > 0 else 'declining'} by {abs(value):.1f} points",
            "subjects_below_50": f"Currently failing {int(value)} subject(s)",
            "missing_assessments_pct": f"{value*100:.0f}% of assessments not submitted",
            "consecutive_declining_terms": f"Performance declining for {int(value)} consecutive term(s)",
            "deviation_from_class_avg": f"{'Above' if value > 0 else 'Below'} class average by {abs(value):.1f} points",
        }
        return explanations.get(name, f"{name}: {value}")
```

#### 6.4 API Endpoints

```python
from fastapi import FastAPI, Depends

app = FastAPI(title="SchoolOS Analytics Service")

@app.get("/api/analytics/students/{student_id}/trajectory")
async def student_trajectory(student_id: str, db = Depends(get_db)):
    """
    Returns score trajectory across terms with trend line.
    Response:
    {
      "student": { "id": "...", "name": "Tudonu David" },
      "terms": [
        { "term": "Term 1 2026-2027", "average": 65.2, "position": 12 },
        { "term": "Term 2 2026-2027", "average": 68.7, "position": 10 },
        { "term": "Term 3 2026-2027", "average": 72.1, "position": 8 },
        { "term": "Term 1 2027-2028", "average": 75.5, "position": 6 }
      ],
      "trend": "improving",
      "projectedEndOfYear": 78.2,
      "subjectBreakdown": [
        { "subject": "Mathematics", "scores": [72, 75, 80, 87], "trend": "strong_improvement" },
        { "subject": "English", "scores": [60, 58, 55, 52], "trend": "declining" }
      ]
    }
    """

@app.get("/api/analytics/classes/{class_arm_id}/at-risk")
async def at_risk_students(class_arm_id: str, db = Depends(get_db)):
    """
    Returns students flagged as at-risk with explanations.
    Response:
    {
      "classArm": { "id": "...", "name": "JSS 2 Ruby" },
      "atRiskStudents": [
        {
          "student": { "id": "...", "name": "Jim Beglin" },
          "riskScore": 78.5,
          "riskLevel": "high",
          "contributingFactors": [
            { "factor": "Scores declining for 2 consecutive terms", "importance": 45 },
            { "factor": "Currently failing 3 subjects", "importance": 30 },
            { "factor": "15% of assessments not submitted", "importance": 15 }
          ],
          "recommendation": "Schedule parent-teacher conference. Consider extra tutoring in Mathematics, English, Science."
        }
      ],
      "classHealth": {
        "averageRiskScore": 25.3,
        "highRiskCount": 3,
        "mediumRiskCount": 5,
        "lowRiskCount": 32
      }
    }
    """

@app.get("/api/analytics/classes/{class_arm_id}/comparison")
async def class_comparison(class_arm_id: str, db = Depends(get_db)):
    """Compare a class against other classes in the same level."""

@app.get("/api/analytics/subjects/{subject_id}/analysis")
async def subject_analysis(subject_id: str, db = Depends(get_db)):
    """Subject-level analysis: which classes perform best, score distributions, teacher effectiveness."""

@app.post("/api/analytics/ml/retrain")
async def retrain_model(db = Depends(get_db)):
    """
    Retrain the risk detection model on latest data.
    Should be triggered periodically or after each term ends.
    """
```

#### 6.5 Frontend Integration

Add an analytics dashboard to the admin portal:
- "At Risk Students" widget on admin home page
- Student detail page shows trajectory chart (line graph using recharts)
- Class detail page shows risk distribution (pie chart: high/medium/low)
- Subject analysis page shows performance distribution across classes

### Skills Practiced

| Skill | How |
|-------|-----|
| Python (FastAPI) | REST API, async endpoints, dependency injection |
| scikit-learn | GradientBoosting, cross-validation, feature importance |
| ML foundations | Feature engineering, train/test split, evaluation metrics |
| Supervised learning | Binary classification (at-risk vs not-at-risk) |
| Evaluation | Precision/recall (cost of false negatives vs false positives) |
| Docker | Python service containerization |
| Systems design | Read-only replica for analytics, separation of concerns |

### Definition of Done

- [ ] `/analytics/students/{id}/trajectory` returns score trend with projected outcome
- [ ] `/analytics/classes/{id}/at-risk` flags struggling students with explanations
- [ ] Risk model achieves F1 > 0.7 on cross-validation
- [ ] Predictions include explainable contributing factors (not just a score)
- [ ] Admin dashboard shows at-risk student widget
- [ ] Model retraining can be triggered after each term

---

## Phase 7 — AI Teaching Assistant

### The Problem

Teachers spend significant time creating assessments, planning lessons, and looking up school policies. Curriculum documents are uploaded but sit unused as flat files. There is no intelligent way to query school knowledge.

### What to Build

A RAG-powered AI assistant that understands school curriculum, policies, and student data.

#### 7.1 Document Ingestion Pipeline

```
ai-service/
  app/
    main.py
    api/
      routes/
        chat.py           # Chat completion endpoint
        documents.py      # Document upload/management
        questions.py      # Question generation
    services/
      ingestion.py        # Document chunking & embedding
      retrieval.py        # Vector search
      generation.py       # LLM generation
      agents/
        question_agent.py  # Multi-step question generation agent
        summary_agent.py   # Class performance summary agent
    vectorstore/
      pgvector.py         # pgvector integration
    models/
      schemas.py
  Dockerfile
```

**Document ingestion flow:**

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
import fitz  # PyMuPDF for PDF parsing

class DocumentIngestion:
    def __init__(self):
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50,
            separators=["\n\n", "\n", ". ", " "],
        )
        self.embedder = SentenceTransformer("all-MiniLM-L6-v2")

    async def ingest(self, file_path: str, metadata: dict):
        """
        1. Parse document (PDF, DOCX, TXT)
        2. Split into chunks
        3. Generate embeddings
        4. Store in pgvector
        """
        text = self._extract_text(file_path)
        chunks = self.splitter.split_text(text)

        embeddings = self.embedder.encode(chunks)

        for chunk, embedding in zip(chunks, embeddings):
            await self.vectorstore.insert(
                content=chunk,
                embedding=embedding,
                metadata={
                    **metadata,
                    "source": file_path,
                    "chunk_index": chunks.index(chunk),
                },
            )
```

#### 7.2 Vector Storage with pgvector

Add the pgvector extension to the existing PostgreSQL database:

```sql
CREATE EXTENSION vector;

CREATE TABLE document_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    embedding vector(384), -- all-MiniLM-L6-v2 produces 384-dim vectors
    metadata JSONB,
    school_id UUID NOT NULL,
    document_type VARCHAR(50), -- 'curriculum', 'policy', 'exam_paper'
    subject_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON document_embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
```

#### 7.3 RAG Pipeline

```python
class RAGService:
    async def query(self, question: str, school_id: str, context_filter: dict = None) -> str:
        # 1. Embed the question
        query_embedding = self.embedder.encode(question)

        # 2. Retrieve relevant chunks
        results = await self.vectorstore.similarity_search(
            embedding=query_embedding,
            school_id=school_id,
            filter=context_filter,  # e.g., {"document_type": "curriculum", "subject_id": "..."}
            top_k=5,
        )

        # 3. Build prompt with retrieved context
        context = "\n\n".join([r.content for r in results])

        prompt = f"""You are a helpful teaching assistant for a school. Answer the question
based on the provided context. If the context doesn't contain enough information, say so.

Context:
{context}

Question: {question}

Answer:"""

        # 4. Generate response using Claude API
        response = await self.llm.generate(prompt)

        return {
            "answer": response,
            "sources": [{"content": r.content[:100], "source": r.metadata["source"]} for r in results],
        }
```

#### 7.4 Question Generation Agent

A multi-step agent that generates quiz questions aligned with the curriculum:

```python
class QuestionGenerationAgent:
    """
    Multi-step agent that:
    1. Looks up the curriculum for the given subject + term
    2. Identifies which topics should be covered
    3. Retrieves past exam papers for style reference
    4. Generates questions at the appropriate difficulty level
    5. Creates a marking scheme
    """

    async def generate(
        self,
        subject_id: str,
        term_id: str,
        topic: str,
        question_count: int = 10,
        difficulty: str = "medium",
    ) -> dict:
        # Step 1: Get curriculum context
        curriculum = await self.tools.get_curriculum(subject_id, term_id)

        # Step 2: Find relevant topics in curriculum
        relevant_topics = await self.tools.search_curriculum(
            query=topic,
            curriculum_id=curriculum.id,
        )

        # Step 3: Retrieve past exam papers for style reference
        past_papers = await self.vectorstore.similarity_search(
            query=f"{topic} exam questions",
            filter={"document_type": "exam_paper", "subject_id": subject_id},
            top_k=3,
        )

        # Step 4: Generate questions
        prompt = f"""Generate {question_count} {difficulty}-level questions on "{topic}"
for {curriculum.subject_name} ({curriculum.level_name}).

Curriculum context:
{relevant_topics}

Style reference from past papers:
{past_papers}

Requirements:
- Mix of question types: multiple choice (4), short answer (3), structured (3)
- Each question should have a clear marking scheme
- Questions should test understanding, not just recall
- Difficulty: {difficulty} (for {curriculum.level_name} students)

Output format: JSON array of questions with marking scheme."""

        result = await self.llm.generate(prompt, response_format="json")
        return result
```

#### 7.5 Performance Summary Agent

```python
class PerformanceSummaryAgent:
    """
    Generates narrative summaries of class/student performance
    by querying the analytics service and formatting results.
    """

    async def summarize_class(self, class_arm_id: str, subject_id: str) -> str:
        # Step 1: Fetch assessment data from analytics service
        assessments = await self.tools.get_class_assessments(class_arm_id, subject_id)

        # Step 2: Fetch at-risk students
        at_risk = await self.tools.get_at_risk_students(class_arm_id)

        # Step 3: Generate narrative summary
        prompt = f"""Write a brief, professional summary of this class's performance
for a parent-teacher conference or admin review.

Class: {assessments['className']}
Subject: {assessments['subjectName']}
Term: {assessments['term']}

Statistics:
- Class average: {assessments['stats']['averageScore']}%
- Highest: {assessments['stats']['highestScore']}%
- Lowest: {assessments['stats']['lowestScore']}%
- Pass rate: {assessments['stats']['passRate']}%

At-risk students: {len(at_risk)} flagged

Top performers: {assessments['topStudents']}
Struggling students: {assessments['bottomStudents']}

Write 3-4 paragraphs covering: overall performance, notable trends,
concerns, and recommendations."""

        return await self.llm.generate(prompt)
```

#### 7.6 API Endpoints

```python
@app.post("/api/ai/chat")
async def chat(request: ChatRequest):
    """General Q&A about school policies, curriculum, etc."""

@app.post("/api/ai/generate-questions")
async def generate_questions(request: QuestionGenRequest):
    """Generate quiz/exam questions for a topic."""

@app.post("/api/ai/summarize-performance")
async def summarize_performance(request: SummaryRequest):
    """Generate narrative performance summary."""

@app.post("/api/ai/documents/upload")
async def upload_document(file: UploadFile, metadata: DocumentMetadata):
    """Upload and ingest a document into the knowledge base."""

@app.get("/api/ai/documents")
async def list_documents(school_id: str):
    """List all ingested documents."""
```

### Skills Practiced

| Skill | How |
|-------|-----|
| RAG pipelines | Document chunking, embedding, retrieval, generation |
| Vector databases | pgvector, similarity search, indexing strategies |
| LLM systems | Prompt engineering, structured output, API integration |
| Agents | Multi-step reasoning, tool use, chaining |
| Deep learning | Sentence transformers for embeddings |
| PyTorch | Understanding embedding models, potential fine-tuning |
| Python (FastAPI) | Async API, file uploads, streaming responses |

### Definition of Done

- [ ] Upload a curriculum PDF → chunks are embedded and searchable
- [ ] "What topics are covered in JSS 2 Mathematics Term 1?" returns accurate answer with sources
- [ ] Generate 10 quiz questions on "Quadratic Equations" with marking scheme
- [ ] "Summarize JSS 2 Ruby's Mathematics performance" produces a readable narrative
- [ ] Response latency under 5 seconds for RAG queries
- [ ] Each school's documents are isolated (multi-tenant)

---

## Phase 8 — Timetable Generation Engine

### The Problem

Schools spend days manually creating timetables at the start of each term. The constraints are complex: no teacher can be in two places at once, no class can have two subjects simultaneously, some subjects need labs, some teachers work part-time, PE needs the field, and double periods are required for certain subjects. One change cascades into dozens of conflicts.

### What to Build

A Golang microservice that automatically generates valid timetables given a set of constraints.

#### 8.1 Constraint Model

```go
type TimetableRequest struct {
    SchoolID    string              `json:"schoolId"`
    SessionID   string              `json:"sessionId"`
    DaysPerWeek int                 `json:"daysPerWeek"` // Usually 5
    PeriodsPerDay int              `json:"periodsPerDay"` // Usually 8
    PeriodDuration int             `json:"periodDuration"` // Minutes
    Breaks      []Break             `json:"breaks"` // Break periods
    Constraints TimetableConstraints `json:"constraints"`
}

type TimetableConstraints struct {
    // Hard constraints (must be satisfied)
    TeacherAssignments []TeacherAssignment `json:"teacherAssignments"`
    // teacher X teaches subject Y in class Z, N periods per week

    // Soft constraints (try to satisfy)
    PreferredSlots     []PreferredSlot     `json:"preferredSlots"`
    // "Mathematics should be in morning slots"

    AvoidConsecutive   []string            `json:"avoidConsecutive"`
    // "Don't schedule PE right before Science Lab"

    DoublePeriods      []DoublePeriod      `json:"doublePeriods"`
    // "Science Lab needs double period"

    MaxPeriodsPerDay   map[string]int      `json:"maxPeriodsPerDay"`
    // "No teacher should have more than 6 periods per day"

    RoomConstraints    []RoomConstraint    `json:"roomConstraints"`
    // "Physics needs Lab Room A"
}

type TeacherAssignment struct {
    TeacherID   string `json:"teacherId"`
    SubjectID   string `json:"subjectId"`
    ClassArmID  string `json:"classArmId"`
    PeriodsPerWeek int `json:"periodsPerWeek"`
}
```

#### 8.2 Solver Using Constraint Propagation + Backtracking

```go
type Solver struct {
    grid       [][][]*Slot // [day][period][classArm] → assigned subject+teacher
    domains    map[string][]Assignment // Possible assignments for each slot
    constraints []Constraint
}

func (s *Solver) Solve(ctx context.Context, req TimetableRequest) (*Timetable, error) {
    ctx, span := otel.Tracer("timetable-service").Start(ctx, "solve-timetable")
    defer span.End()

    s.initialize(req)

    // Apply constraint propagation to reduce domains
    s.propagate()

    // Backtracking search with MRV (Minimum Remaining Values) heuristic
    solution, err := s.backtrack(ctx, 0)
    if err != nil {
        return nil, fmt.Errorf("no valid timetable found: %w", err)
    }

    return s.buildTimetable(solution), nil
}

func (s *Solver) backtrack(ctx context.Context, depth int) (bool, error) {
    // Check context cancellation (timeout)
    select {
    case <-ctx.Done():
        return false, ctx.Err()
    default:
    }

    // Find unassigned slot with fewest remaining options (MRV heuristic)
    slot := s.selectUnassignedSlot()
    if slot == nil {
        return true, nil // All slots assigned — solution found
    }

    // Try each possible assignment
    for _, assignment := range s.domains[slot.Key()] {
        if s.isConsistent(slot, assignment) {
            s.assign(slot, assignment)

            // Propagate constraints
            removed := s.propagateFrom(slot)

            if ok, _ := s.backtrack(ctx, depth+1); ok {
                return true, nil
            }

            // Undo assignment and propagation
            s.unassign(slot)
            s.restore(removed)
        }
    }

    return false, nil
}
```

#### 8.3 Parallel Solution Search

Try multiple random orderings concurrently to find a solution faster:

```go
func (s *Service) SolveParallel(ctx context.Context, req TimetableRequest) (*Timetable, error) {
    ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
    defer cancel()

    results := make(chan *Timetable, 1)
    numWorkers := runtime.NumCPU()

    var wg sync.WaitGroup
    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go func(seed int64) {
            defer wg.Done()
            solver := NewSolver(seed) // Different random seed = different search order
            timetable, err := solver.Solve(ctx, req)
            if err == nil {
                select {
                case results <- timetable:
                    cancel() // Found solution, cancel other workers
                default:
                }
            }
        }(int64(i))
    }

    go func() {
        wg.Wait()
        close(results)
    }()

    timetable, ok := <-results
    if !ok {
        return nil, fmt.Errorf("no valid timetable found within timeout")
    }
    return timetable, nil
}
```

#### 8.4 API

```
POST /api/timetable/generate
  Body: TimetableRequest
  Response: { jobId: "..." }

GET  /api/timetable/jobs/{jobId}
  Response: { status: "solving", attempts: 45, elapsed: "12s" }

GET  /api/timetable/jobs/{jobId}/result
  Response: Complete timetable grid

POST /api/timetable/validate
  Body: Partial or complete timetable
  Response: { valid: false, violations: [...] }

POST /api/timetable/{id}/swap
  Body: { slot1: {...}, slot2: {...} }
  Response: Updated timetable (with conflict check)
```

### Skills Practiced

| Skill | How |
|-------|-----|
| Golang | Complex data structures, recursive algorithms |
| Concurrency | Parallel search with cancellation, first-result-wins pattern |
| Algorithms | CSP (constraint satisfaction), backtracking, MRV heuristic |
| Systems design | Modeling complex real-world constraints as code |
| Operating systems | Context cancellation, timeouts, CPU-bound parallelism |

### Definition of Done

- [ ] Generates valid timetable for a school with 20 classes, 30 teachers, 15 subjects in under 30 seconds
- [ ] No hard constraint violations (teacher conflicts, room conflicts)
- [ ] Soft constraints satisfied where possible (morning math, double periods)
- [ ] Manual swap feature validates constraints before applying
- [ ] Admin can regenerate timetable with modified constraints

---

## Architecture Overview

After all phases, the system looks like this:

```
                    ┌─────────────────┐
                    │   Admin Portal  │
                    │   (Next.js)     │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │  API Gateway /  │
                    │  K8s Ingress    │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────────┐
          │                  │                       │
  ┌───────┴────────┐ ┌──────┴───────┐  ┌───────────┴──────────┐
  │  NestJS Core   │ │  Go Services │  │  Python Services     │
  │  (TypeScript)  │ │              │  │                      │
  │                │ │  - Notifier  │  │  - Analytics/ML      │
  │  - Auth        │ │  - Reports   │  │  - AI Assistant      │
  │  - BFF Admin   │ │  - Timetable │  │  - Risk Detection    │
  │  - BFF Teacher │ │              │  │                      │
  │  - BFF Student │ │              │  │                      │
  │  - Assessments │ │              │  │                      │
  └───────┬────────┘ └──────┬───────┘  └───────────┬──────────┘
          │                  │                       │
          │          ┌───────┴───────┐               │
          │          │  Redis        │               │
          │          │  (Events/     │               │
          │          │   Cache)      │               │
          │          └───────────────┘               │
          │                                          │
          └────────────────┬─────────────────────────┘
                           │
                  ┌────────┴────────┐
                  │   PostgreSQL    │
                  │   + pgvector    │
                  └─────────────────┘
                           │
              ┌────────────┴────────────┐
              │   AWS S3                │
              │   (PDFs, Documents)     │
              └─────────────────────────┘


  Observability Layer (all services):
  ┌──────────────────────────────────────────┐
  │  OpenTelemetry → Prometheus → Grafana    │
  └──────────────────────────────────────────┘

  Infrastructure:
  ┌──────────────────────────────────────────┐
  │  Terraform → AWS (VPC, EKS, RDS, etc.)  │
  │  GitHub Actions → CI/CD                  │
  └──────────────────────────────────────────┘
```

---

## Skills Matrix

| Skill Area | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 | Phase 6 | Phase 7 | Phase 8 |
|-----------|---------|---------|---------|---------|---------|---------|---------|---------|
| **Golang** | | x | | | x | | | x |
| **Python (FastAPI)** | | | | | | x | x | |
| **Node.js (NestJS)** | x | x | | x | | | | |
| **REST APIs** | | x | | | x | x | x | x |
| **Event-driven** | | x | | | | | | |
| **Async systems** | | x | | | x | | | |
| **Docker** | x | x | | | x | x | x | x |
| **Kubernetes** | | | x | x | | | | |
| **Terraform** | | | x | | | | | |
| **AWS** | | | x | | x | | | |
| **CI/CD** | x | | x | | | | | |
| **Prometheus** | | | | x | | | | |
| **Grafana** | | | | x | | | | |
| **OpenTelemetry** | | | | x | | | | |
| **Linux** | x | | x | | | | | |
| **Concurrency** | | x | | | x | | | x |
| **Networking** | | | x | x | | | | |
| **System design** | | x | x | x | x | x | | x |
| **Security** | x | | x | | | | | |
| **ML / scikit-learn** | | | | | | x | | |
| **Deep learning / PyTorch** | | | | | | | x | |
| **RAG / Vector DBs** | | | | | | | x | |
| **LLM systems / Agents** | | | | | | | x | |

---

## Getting Started

1. Start with **Phase 1** — everything else depends on having proper containerization and CI.
2. Phases 2-4 form the **platform foundation** — messaging, deployment, observability.
3. Phases 5-6 add **high-value features** that schools will actually use.
4. Phases 7-8 are the **most ambitious** — tackle them after the foundation is solid.

Each phase is self-contained enough to be completed independently, but they compound when built in order.
