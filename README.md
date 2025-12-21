# CineStream

A microservices-based streaming platform built with Node.js, Express, Next.js, and Docker.

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

## Getting Started

1. Clone the repository
2. Run `docker-compose up --build` to start all services
3. Access the frontend at http://localhost:3000

## Services

- **API Gateway**: Port 3000
- **Auth Service**: Port 4001
- **User Service**: Port 4002
- **Content Service**: Port 4003
- **Interaction Service**: Port 4004
- **Notification Service**: Port 4005

## Infrastructure

- MongoDB: Port 27017
- Redis: Port 6379
- RabbitMQ: Ports 5672, 15672
