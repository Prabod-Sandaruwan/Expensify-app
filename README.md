# Full-Stack Demo

Spring Boot 4 backend + React frontend with MySQL.

## Prerequisites

- **Backend:** Red Hat OpenJDK 25 (or Java 21+), Maven
- **Frontend:** Node.js 18+, npm
- **Database:** Docker (for MySQL)

## Quick Start

### 1. Start MySQL

```bash
docker compose up -d
```

Wait until MySQL is healthy (e.g. `docker compose ps` shows healthy).

### 2. Run the backend

```bash
cd server
mvn spring-boot:run
```

Backend runs at **http://localhost:8080**. Test: [http://localhost:8080/api/test](http://localhost:8080/api/test).

### 3. Run the frontend

```bash
cd client
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**. Use the **Test Connection** button to call the backend.

## Project layout

| Path | Description |
|------|-------------|
| `server/` | Spring Boot 4.0 (Maven): Web, JPA, MySQL, Lombok |
| `client/` | React (Vite) + Tailwind CSS + Framer Motion |
| `docker-compose.yml` | MySQL 8.0 for local development |

## API

- **GET /api/test** — Returns `{ "status": "ok", "message": "Backend is reachable", "timestamp": "..." }`.

## Database

Default connection (from `server/src/main/resources/application.properties`):

- Host: `localhost:3306`
- Database: `appdb`
- User: `appuser`
- Password: `apppass`

Change these or set env vars if needed.
