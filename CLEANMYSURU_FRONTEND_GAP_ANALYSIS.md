# CleanMysuru AI — Frontend Gap Analysis

This document provides a comprehensive, rigorous comparison between the **existing CleanMysuru frontend** (unpacked from `clean-mysuru-ai-frontend.zip`) and the requirements established from the **HACKMYSURU 1.0 problem statement**, **CPCB C&D Waste Management Rules 2025**, **Karnataka SWM Audit Report**, and **NITI Aayog / CSE Waste-Wise Cities Report**.

---

## Already Implemented

### 1. Visual Design & Shell Architecture
* **Dark-Themed Civic Operations UI:** Sleek, modern styling with dark slate/emerald palette, glassmorphic headers, responsive sidebar (`Sidebar`), app header (`AppShell`), and branded logo (`Logo`).
* **Design Token Consistency:** Consistent badge components (`SeverityBadge` for Low, Medium, High, Critical; `StatusBadge` for Pending, Verified, Needs Review, Rejected).
* **Demo Badge & Awareness:** Top-bar `DEMO MODE / LIVE` indicator and clear labeling of demo records.

### 2. Detection Experience (`/detect`)
* **Interactive Scenario Selector:** `DemoScenarioBar` pre-loaded with 5 core scenarios (`Normal C&D`, `Night footage`, `Possible duplicate`, `Wrong location`, `Low confidence`).
* **Multi-Stage AI Scan Animation:** `ScanAnimation` displaying a 7-stage pipeline sequence:
  1. Evidence Received
  2. Image Quality Assessment
  3. Vision Detection
  4. Severity Analysis
  5. Duplicate Check
  6. Location Check
  7. Incident Generated
* **AI Detection Result Presentation:** Displays detected category, percentage confidence score, severity badge, reason summary, recommended action, and location tag.
* **Evidence Visualizer (`EvidenceViewer`):** Overlay box on evidence image displaying predicted class tag (e.g., `C&D WASTE · 94%`) with simulated night-vision dimming filter when image quality is `'Night'`.

### 3. Incident Intelligence (`/incidents` and `/incidents/:id`)
* **Filterable Incident Catalog:** Search bar matching text across titles/locations and quick-category pill buttons (`All`, `C&D Waste`, `Garbage`, `Overflowing Bin`, `Mixed Waste`).
* **Incident Card Component (`IncidentCard`):** Displays thumbnail, category, location, timestamp, source badge, severity, and status.
* **Detailed Incident View (`/incidents/:id`):** Large evidence viewer, high-impact confidence readout, image quality label, AI reasoning, recommended civic action, and a 5-step lifecycle timeline (`Evidence uploaded` → `AI analyzed` → `Incident created` → `Verification started` → `Verified`).

### 4. Human Verification Queue (`/verification`)
* **Queue Filter Cards:** 4 summary counters for verification sub-categories:
  * `LOW CONFIDENCE` (2 cases)
  * `NIGHT FOOTAGE` (4 cases)
  * `LOCATION MISMATCH` (3 cases)
  * `POSSIBLE DUPLICATE` (6 cases)
* **Triage Card Layout:** List view showing evidence thumbnail, review tags, severity, incident summary, AI confidence, location, source, and 3 action buttons (`Verify`, `Request review`, `Reject`).

### 5. Municipal Dashboard (`/dashboard`)
* **Executive Metric Cards (`StatCard`):** Total incidents (1,248), Active (87), Needs verification (23), High severity (14).
* **Recharts Visualizations:**
  * Area chart for incident detection volume over days of the week.
  * Donut pie chart for waste classification split (C&D: 42%, Garbage: 28%, Mixed: 18%, Overflowing Bin: 12%).
* **Recent Activity Feed:** Compact list of latest detected incidents.

### 6. Map Screen (`/map`)
* **Map Filter Sidebar:** Dropdown controls for Incident Type, Severity, Status, and Date Range.
* **Incident Markers & Hover Cards:** Rendered marker pins with severity-based coloring (Critical = Rose, High = Orange, Medium/Low = Emerald) with hover tooltip popovers showing incident metadata.

---

## Missing

### 1. Real File Intake & Multi-Modal Evidence Support (`/detect`)
* **No Actual File Upload Handling:** The file drop zone in `/detect` has no working `<input type="file" />` event handler. Clicking "Browse files" merely sets `selected` to hardcoded `incidents[0]`.
* **No Video Ingestion / Frame Sampling:** The UI advertises MP4 support, but cannot accept a video file, extract representative keyframes, or display video scrub controls.
* **No EXIF / Geolocation Extraction:** Cannot read image capture timestamp or embedded GPS coordinates from genuine smartphone/dashcam photos.

### 2. Jurisdiction & Civic Boundary Context
* **Missing MCC vs. Peri-Urban Boundary Handling:** Problem Statement emphasizes that Mysuru is absorbing 1 CMC (Hootagalli), 4 Town Panchayats (Bogadi, Kadakola, Rammanahalli, Srirampura), and 8 Gram Panchayats. Currently, the location is a static string ("Vijayanagar 2nd Stage") with zero administrative jurisdiction tag (e.g., "MCC Ward 14" vs "Bogadi TP" vs "Disputed Jurisdiction").
* **No Jurisdiction Routing in Incidents:** No display of which municipal office or Zonal Office is responsible for dispatch.

### 3. Genuine Map Engine (`/map` and `/dashboard`)
* **Fake CSS Grid Instead of Real GIS Map:** The map in `/map` and `/dashboard` uses mathematical CSS coordinate percentages (`left: 12 + (index * 11) % 76%`) placed on a decorative CSS grid pattern. Real coordinates in `demo-data.ts` (e.g., `coords: [12.2958, 76.6394]`) are completely ignored.
* **No Interactive Pan / Zoom / Basemap:** No OpenStreetMap, Leaflet, or MapLibre layer showing actual Mysuru roads, landmarks (Chamundi Hill, Ring Road, KRS Road), or ward boundaries.

### 4. Deduplication Inspection View
* **No Side-by-Side Duplicate Comparison:** When an incident is tagged as `Possible Duplicate` (e.g., CM-1043), there is no UI view showing the *existing earlier incident* alongside the *new submission* to let an officer confirm or dismiss the duplicate.

### 5. Location Mismatch Verification View
* **No Discrepancy Map in Verification:** When an incident is tagged as `Location Mismatch` (e.g., CM-1042), there is no visual map showing reported location vs. actual photo geotag or suspected landmark.

### 6. Dynamic State Management & Dispatch
* **No Working State Mutation:** Clicking `Verify` or `Reject` on `/verification` does nothing (no state change, no removal from queue, no toast notification).
* **"Create Civic Incident" on `/detect` is a No-Op:** Clicking the button simply clears the screen (`setResult(null)`) rather than appending a new record to the incident list or navigating to its detail page.

---

## Needs Improvement

### 1. Legal / Claim Safety Framing
* **Current Issue:** Some mock strings use overly definitive wording (e.g., "Verified construction debris requiring civic follow-up").
* **Required Fix:** Adopt strictly compliant, legally safe terminology across cards, tooltips, and badges:
  * Replace accusatory phrasing with **"Suspected C&D Waste"**, **"Suspected Civic-Waste Incident"**, **"Requires Municipal Verification"**.
  * Add explicit disclaimer: *"AI output is preliminary evidence for municipal screening and does not constitute statutory proof of liability."*

### 2. Filter Interactivity on Map and Incidents
* **Map Filters Inoperable:** The `<select>` dropdowns on `/map` (Incident type, Severity, Status) have no `onChange` handlers and do not filter markers.
* **Incidents Filter Limitations:** Incidents page only filters by Category name and query text; cannot filter by Status (`Needs Review`, `Pending`, `Verified`) or Severity (`Critical`, `High`).

### 3. Detail Page Interactivity (`/incidents/:id`)
* **Static Buttons:** "Start verification" button on the incident detail page has no action attached. It should either trigger verification directly or navigate to `/verification?id=CM-XXXX`.
* **Missing Action Workflow:** Does not allow assigning an incident to a specific ward team, ZWM center, or C&D intermediate facility.

### 4. Edge Case Feedback
* **Blurry / Dark Image Warnings:** If a photo is severely degraded, the UI should explicitly present an image quality warning card ("Low Light / Under-exposed: Confidence dampened to 68% - Forwarded to Human Verification").

---

## Backend Integration Points

When the backend API is built, the frontend must integrate with the following endpoints:

| Frontend Feature | Target Backend Endpoint | Payload / Parameters | Expected Response |
| :--- | :--- | :--- | :--- |
| **Evidence Analysis** | `POST /api/detect/analyze` | `FormData` (file: image/video, source, manualLocation) | Detection JSON (type, confidence, severity, quality, bboxes, reasoning) |
| **Incident Creation** | `POST /api/incidents` | Incident creation payload from detection result | Newly created Incident record with generated ID (`CM-XXXX`) |
| **Incident Listing & Filters** | `GET /api/incidents` | `?type=...&severity=...&status=...&ward=...` | Paginated incident list + filter aggregations |
| **Incident Details** | `GET /api/incidents/:id` | Incident ID | Full incident details, timeline, telemetry, audit trail |
| **Verification Actions** | `POST /api/incidents/:id/verify` | `{ action: 'VERIFY' \| 'REJECT', notes: '...' }` | Updated incident record with new status |
| **Dashboard Statistics** | `GET /api/dashboard/stats` | None / Date range | Total, active, verification required, high severity counts, trend chart data |
| **Spatial Signals / GeoJSON**| `GET /api/map/signals` | `?bounds=...` | GeoJSON FeatureCollection of incidents with coordinates and severity |

---

## AI Integration Points

The frontend needs clean visual interfaces for the following AI vision outputs:

1. **Vision Inference Schema:**
   * Visual bounding boxes / hotspots over detected debris piles.
   * Multi-class classification score distribution (e.g., C&D: 94%, Garbage: 4%, Inerts: 2%).
2. **Image Quality Assessment Telemetry:**
   * Blur metric, exposure/lighting level, resolution adequacy, night-vision flag.
3. **Automated Deduplication Heuristic:**
   * Similarity score, distance in meters to nearest matching incident, ID of matched previous incident.
4. **Automated Severity Calculation:**
   * Estimated footprint/volume scale, proximity hazard (arterial road, school zone, drainage canal).
5. **Legally Safe Explainability Generation:**
   * Structured rationale text explaining *why* the visual features match C&D (e.g., "Identified fractured concrete chunks, red brick masonry fragments, and unbagged stone aggregate").

---

## Demo-Critical Improvements (For Hackathon Judges)

To win the hackathon demo, the following items are the highest-impact visual and workflow upgrades:

1. **Working State Store (React Context / LocalStorage):**
   * Actions taken in `/verification` (verifying or rejecting an incident) must immediately update the badge on `/incidents`, decrement the "Needs verification" counter on `/dashboard`, and update the map pin.
2. **Interactive Leaflet / OpenStreetMap Integration (`/map`):**
   * Replace the decorative CSS grid with a real Leaflet map centered on Mysuru (`[12.2958, 76.6394]`).
   * Display real markers on landmark locations: Bogadi Road, Vijayanagar, Kuvempunagar, Saraswathipuram, Hootagalli, Vidyaranyapuram.
3. **Real Image File Upload with Instant Inference Simulation:**
   * Allow judges to upload *any* test photo or drag-and-drop sample images from their desktop, showing instant responsive scanning and analysis.
4. **Side-by-Side "Duplicate Evidence" Modal in `/verification`:**
   * For the "Possible Duplicate" scenario (CM-1043), show a side-by-side view: "Original Incident CM-1041 (Reported 4h ago)" vs "Incoming Submission CM-1043 (Reported 12m ago, distance: 34m)".
5. **Side-by-Side "Location Mismatch" Warning in `/verification`:**
   * For CM-1042, show map view showing GPS coordinate pin (Nazarbad) vs. user-selected tag (Vijayanagar) with mismatch callout.
6. **Live Toast Notifications:**
   * Provide feedback upon incident creation, verification approval, or rejection.

---

## Recommended Implementation Order

### Phase 1 — Interactive Frontend State & Functional Glue
* Convert mock handlers in `demo-data.ts` into a reactive client-side store (React Context / Zustand / LocalStorage) so verifying, rejecting, or creating an incident mutates state and updates counters across all pages.
* Wire up `Verify` and `Reject` buttons in `/verification` to actually resolve items and show feedback.
* Wire up `/detect` "Create Civic Incident" button to push the incident into the store and navigate to `/incidents/:id`.

### Phase 2 — Real Mapping Layer (`/map` & `/dashboard`)
* Integrate Leaflet (`react-leaflet`) with OpenStreetMap tiles for Mysuru.
* Plot true coordinate markers with popup cards and filter responsiveness (by category, severity, status).

### Phase 3 — File Upload & Multi-Scenario Enhancements (`/detect`)
* Add working `<input type="file" />` with drag-and-drop preview for custom user images.
* Add sample gallery drawer so judges can click 1-click test photos (Daytime C&D, Night C&D, Overflowing Bin, Clear Street / No Waste).

### Phase 4 — Verification Detail Views (`/verification`)
* Build side-by-side visual comparison for duplicates.
* Build discrepancy callout for location mismatches.

### Phase 5 — Compliance & Jurisdiction Polishing
* Update all text badges and headers to use legally safe terminology ("Suspected C&D Waste", "Requires Municipal Verification").
* Add Greater Mysuru boundary / jurisdiction tags (MCC Ward vs. Town Panchayat).

### Phase 6 — Backend API & AI Vision Integration (When Backend is Built)
* Connect frontend client store to real Express/FastAPI endpoints and vision model inference.
