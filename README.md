# Clinic Queue System

A small clinic reception queue built with Node.js, Express, React, and Vite. Patient
records are stored in `data.json` and managed through a REST API that supports insert,
retrieve, and delete.

## Running locally

```bash
npm install
npm run dev
```

- Frontend: http://localhost:3000
- API: http://localhost:4000

Vite proxies `/api` requests to the Express server during development. Set `PORT` to
run the API on a different port, and update the proxy in `vite.config.ts` to match.

## Production build

```bash
npm run build
npm start
```

The Express server serves the built frontend and the API from http://localhost:3000.

## API

All responses are JSON. The resource is `queue`.

| Method | Endpoint          | Purpose                  |
| ------ | ----------------- | ------------------------ |
| GET    | `/api/queue`      | Retrieve all records     |
| GET    | `/api/queue/:id`  | Retrieve one record      |
| POST   | `/api/queue`      | Insert a new record      |
| DELETE | `/api/queue/:id`  | Delete a record          |

### Record shape

```json
{
  "id": 1,
  "patientName": "Maria Santos",
  "age": 34,
  "contactNumber": "0917 555 0142",
  "service": "General Consultation",
  "priority": "Regular",
  "status": "Waiting",
  "createdAt": "2026-10-26T08:05:00.000Z"
}
```

### Insert example

```bash
curl -X POST http://localhost:3000/api/queue \
  -H "Content-Type: application/json" \
  -d '{
    "patientName": "Ana Dela Cruz",
    "age": 28,
    "contactNumber": "0917 555 0100",
    "service": "General Consultation",
    "priority": "Regular"
  }'
```

The server validates the patient name, age, service, and optional contact number. New
records receive the next queue number, a `Waiting` status, and a timestamp.

## Frontend

The reception screen can:

- View the full queue and summary counts
- Search for one patient by queue number
- Add a walk-in patient
- Delete a queue entry

Only insert, retrieve, and delete are implemented. There are no update endpoints or
controls.

## Project layout

```text
.
├── data.json          # JSON data source
├── server/
│   └── index.js       # Express API and static file server
├── src/               # React frontend
├── public/
└── vite.config.ts
```
