# Parking Map Design Spec
**Date:** 2026-06-15
**Branch:** just-the-parking

## Overview

A standalone map showing all surface parking in Tulsa as an art/advocacy piece — stripping away streets and buildings to reveal how much land is consumed by car storage. Any registered user can contribute by digitizing parking lot polygons. The public sees a clean, minimal map.

## Goals

- Visualize the full footprint of surface parking in Tulsa
- Enable collaborative digitizing by authenticated users
- Public view: stark, minimal — parking only, streets hidden by default
- Editor view: satellite imagery, draw and manage polygon contributions

## Data Model

### `ParkingLot`
| Field | Type | Notes |
|-------|------|-------|
| `coordinates` | JSONB | GeoJSON polygon coordinate array (`[[lng, lat], ...]`) |
| `user_id` | integer | FK to users, the contributor |
| `created_at` | datetime | |
| `updated_at` | datetime | |

Belongs to `User`. No metadata fields needed.

## Routes

### Web
| Method | Path | Controller#Action | Auth |
|--------|------|-------------------|------|
| GET | `/parking` | `parking_lots#index` | Public |
| GET | `/parking/edit` | `parking_lots#edit` | Required |

### API
| Method | Path | Notes | Auth |
|--------|------|-------|------|
| GET | `/api/v1/parking_lots/geojson` | FeatureCollection of all lots | Public |
| POST | `/api/v1/parking_lots` | Create a polygon | Required |
| PATCH | `/api/v1/parking_lots/:id` | Update polygon coordinates | Required |
| DELETE | `/api/v1/parking_lots/:id` | Remove a polygon | Required |

## Public View (`/parking`)

- Full-screen Mapbox map
- Minimal style: light/white background, no labels, no POIs, no building extrusions
- Parking polygons rendered as a fill layer in amber/yellow
- Toggle button (corner): "Show streets" — off by default, faint gray street grid when on
- Page title visible, otherwise map fills viewport
- No incident data or other layers

## Editor (`/parking/edit`)

- Full-screen Mapbox map on satellite imagery
- Mapbox Draw (`@mapbox/mapbox-gl-draw`) in polygon mode
- All saved parking lots loaded as a non-editable reference layer (prevents double-tracing by any contributor)
- Auto-save on draw complete → `POST /api/v1/parking_lots`
- Reshape existing polygon → auto-save on complete → `PATCH /api/v1/parking_lots/:id`
- Select existing polygon → delete button → `DELETE /api/v1/parking_lots/:id`
- No manual save button — all operations are automatic
- Redirect to sign-in if unauthenticated

## Frontend

Two new Stimulus controllers:
- `parking_map_controller.ts` — public view, loads GeoJSON, renders fill layer, handles streets toggle
- `parking_editor_controller.ts` — editor view, initializes Mapbox Draw, handles auto-save/delete API calls

New npm dependency: `@mapbox/mapbox-gl-draw`

## Out of Scope

- Polygon naming or categorization
- Import from external GeoJSON sources
- Approval/moderation workflow for contributions
- Statistics or area calculations on the public view
