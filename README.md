# Clinic Queue System

## Run locally

```bash
npm install
npm run dev
```

- Frontend: http://localhost:3000
- API: http://localhost:4000

### Production

```bash
npm run build
npm start
```

- Frontend and API: http://localhost:3000

## API

Resource: `queue`

| Method | Endpoint         | Description          |
| ------ | ---------------- | -------------------- |
| GET    | `/api/queue`     | Retrieve all records |
| GET    | `/api/queue/:id` | Retrieve one record  |
| POST   | `/api/queue`     | Insert a record      |
| DELETE | `/api/queue/:id` | Delete a record      |

All responses are JSON. Records are stored in `data.json`.

`POST /api/queue` accepts:

```json
{
  "patientName": "Maria Santos",
  "age": 34,
  "contactNumber": "0917 555 0142",
  "service": "General Consultation",
  "priority": "Regular"
}
```
