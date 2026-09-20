# CleanMysuru AI — Production Backend

Production-structured Node.js and Express backend for **CleanMysuru AI**, an AI-powered civic waste detection and incident management platform.

---

## 1. Tech Stack

- **Runtime:** Node.js (v24+)
- **Framework:** Express.js
- **Database:** SQLite with Prisma ORM
- **File Ingestion:** Multer (images & videos, max 50MB)
- **Image Intelligence:** Sharp (luminance, blur assessment, resolution checks, perceptual hashing)
- **Schema Validation:** Zod
- **AI Integration:** Google Gemini Vision (with deterministic Demo mode fallback)

---

## 2. Directory Structure

```text
backend/
├── src/
│   ├── server.js              # Server bootstrapper & shutdown listener
│   ├── app.js                 # Express application & middleware setup
│   ├── config/
│   │   ├── index.js           # Environment configuration loader
│   │   └── prisma.js          # PrismaClient singleton
│   ├── routes/
│   │   ├── health.routes.js   # GET /api/health
│   │   ├── analyze.routes.js  # POST /api/analyze
│   │   ├── incidents.routes.js# CRUD + Verify endpoints
│   │   ├── dashboard.routes.js# GET /api/dashboard/stats
│   │   └── map.routes.js      # GET /api/map/incidents
│   ├── controllers/
│   │   ├── health.controller.js
│   │   ├── analyze.controller.js
│   │   ├── incidents.controller.js
│   │   ├── dashboard.controller.js
│   │   └── map.controller.js
│   ├── services/
│   │   ├── ai.service.js        # Gemini Vision + deterministic Demo fallback
│   │   ├── image.service.js     # Sharp quality assessment (luminance, blur) & dHash
│   │   ├── video.service.js     # FFmpeg frame extractor with graceful fallback
│   │   ├── duplicate.service.js # Spatial distance & perceptual hash deduplication
│   │   ├── severity.service.js  # Multi-factor explainable civic severity calculation
│   │   └── location.service.js  # Mysuru bounds & peri-urban jurisdiction mapping
│   ├── middleware/
│   │   ├── upload.middleware.js # Multer configuration & limits
│   │   ├── validate.middleware.js # Zod validation handler
│   │   └── error.middleware.js  # Centralized error handler
│   ├── utils/
│   │   ├── logger.js            # Structured logger
│   │   ├── id.generator.js      # Human-readable ID generator (CM-2026-XXXX)
│   │   ├── distance.js          # Haversine distance calculator in meters
│   │   └── response.js          # Standardized response formatters
│   └── validators/
│       ├── analyze.validator.js
│       └── incident.validator.js
├── prisma/
│   ├── schema.prisma            # Incident, DetectionResult, Verification, DuplicateMatch
│   └── seed.js                  # 8 demo incidents covering hackathon test scenarios
├── uploads/                     # Uploaded evidence directory (served via /uploads)
├── .env.example                 # Environment configuration template
├── package.json
└── README.md
```

---

## 3. Environment Variables

Create a `.env` file in `backend/`:

```env
PORT=5000
DATABASE_URL="file:./dev.db"
FRONTEND_URL="http://localhost:3000"

# Optional: Set your Gemini API Key. If empty, the backend runs in deterministic DEMO mode.
AI_API_KEY=
AI_MODEL="gemini-1.5-flash"

UPLOAD_DIR="./uploads"
```

---

## 4. Setup & Running

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run seed
npm run dev
```

The backend starts on `http://localhost:5000`.

---

## 5. API Endpoints

### Health
- `GET /api/health` -> Service health check

### Evidence Analysis Pipeline
- `POST /api/analyze` -> Multipart form-data with `image` or `video`, `sourceType`, `latitude`, `longitude`, `locationName`
  - Runs Sharp image quality check (detects blur, dark/night, small files)
  - Runs AI vision model (or deterministic fallback with `analysisMode: "DEMO"`)
  - Calculates explainable severity (LOW, MEDIUM, HIGH, CRITICAL)
  - Runs duplicate check against existing incidents in database
  - Checks location bounds and civic jurisdiction

### Incidents
- `POST /api/incidents` -> Create a new incident record in SQLite with human-readable ID (`CM-2026-0001`)
- `GET /api/incidents` -> List incidents with filters (`type`, `severity`, `verificationStatus`, `sourceType`, `search`, pagination)
- `GET /api/incidents/:id` -> Detailed incident with detection history, audit trail, and duplicate matches
- `PATCH /api/incidents/:id` -> Update incident fields
- `DELETE /api/incidents/:id` -> Delete incident
- `PATCH /api/incidents/:id/verify` -> Human-in-the-loop review action (`VERIFIED`, `REJECTED`, `NEEDS_REVIEW`)

### Dashboard
- `GET /api/dashboard/stats` -> Executive metrics (total, active, needsVerification, highSeverity, breakdown by type & severity, recent detections)

### Spatial Map
- `GET /api/map/incidents` -> Leaflet-ready coordinate pins with severity and jurisdiction flags
