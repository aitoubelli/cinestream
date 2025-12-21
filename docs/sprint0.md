# Sprint 0: Project Setup & Dev Environment Scaffolding

> Duration: 1–2 days
> Goal: Initialize the CineStream monorepo, scaffold all microservices, and establish a working Docker Compose development environment.

---

## Deliverables

- [x] GitHub/GitLab repository created: `cinestream`
- [x] Consistent project structure defined
- [x] `docker-compose.yml` with all services and infrastructure (MongoDB, Redis, RabbitMQ)
- [x] Each microservice initialized with:
  - Minimal Express server
  - `.env.example`
  - `Dockerfile`
  - Basic health-check endpoint
- [x] Next.js frontend bootstrapped (App Router + TypeScript)
- [x] Full stack runs with `docker-compose up --build`
- [x] Initial commit pushed to `main`

---

## Project Structure

```
cinestream/
├── docker-compose.yml
├── .gitignore
├── README.md
├── docs/
│   └── sprint0.md
├── frontend/ # Next.js (App Router, TypeScript)
└── services/
    ├── api-gateway/
    ├── auth-service/
    ├── user-service/
    ├── content-service/
    ├── interaction-service/
    └── notification-service/
```


---

## Infrastructure Services (`docker-compose.yml`)

| Service       | Image               | Port(s)          | Purpose                     |
|---------------|---------------------|------------------|-----------------------------|
| `mongodb`     | `mongo:6`           | `27017`          | Main database               |
| `redis`       | `redis:7`           | `6379`           | Caching + Pub/Sub           |
| `rabbitmq`    | `rabbitmq:3-management` | `5672`, `15672` | Async messaging             |

> All microservices connect to these via Docker network.

---

## Microservice Template (Per Service)

Each service includes:

- **`package.json`** with Express, dotenv, etc.
- **`.env.example`** (never commit real secrets)
- **`Dockerfile`** (Alpine-based, production-optimized)
- **`server.js`** (or `server.ts`) with:
  ```js
  app.get('/health', (req, res) => res.json({ status: '<Service> OK' }));
  ```

  Exposed port (unique per service):

  - api-gateway: 3000
  - auth-service: 4001
  - user-service: 4002
  - content-service: 4003
  - interaction-service: 4004
  - notification-service: 4005
