# Parking OSM Import Design Spec
**Date:** 2026-06-16
**Branch:** just-the-parking

## Overview

Import surface parking lot polygons from OpenStreetMap into the `parking_lots` table using the Overpass API. Idempotent — re-running skips already-imported lots. First of multiple planned import sources; all sources feed the same `parking_lots` table.

## Goals

- Populate `parking_lots` with OSM surface parking data for Tulsa
- Idempotent: re-running the task never duplicates records
- Extensible: data model generalizes to future sources (AI detection, other datasets)
- Simple: rake task invocation, no UI needed

## Data Model Changes

### `parking_lots` — two new nullable columns

| Column | Type | Notes |
|--------|------|-------|
| `source` | string | `"osm"` for imported lots; `nil` for manually digitized |
| `external_id` | string | `"way/12345678"` or `"relation/98765"` for OSM; `nil` for manual |

**Unique index on `[source, external_id]`** — enforces idempotency at the DB level.

### `user_id` — make nullable

Currently `null: false`. Imported lots have no contributing user, so this constraint must be relaxed. Manually digitized lots continue to set `user_id`.

## Architecture

### Service: `app/services/parking_lot_importer.rb`

Single public method: `#import`. Returns `{ imported: N, skipped: N, failed: N }`.

**Steps:**
1. Query Overpass API for `amenity=parking` + `parking=surface` within Tulsa bounding box (`35.9,-96.1,36.4,-95.7`)
2. Request both `way` and `relation` element types with `out geom` to get coordinates inline
3. For each element, convert geometry to `[[lng, lat], ...]` coordinate array (closing the ring)
4. Call `ParkingLot.find_or_create_by(source: "osm", external_id: "#{type}/#{id}")` — skips if exists, creates if not
5. Accumulate and return the summary hash

**Error handling:** If the Overpass HTTP request fails or returns a non-200 status, raise a descriptive `RuntimeError`. Individual record failures (e.g. invalid geometry) increment `failed` and continue — the task does not abort.

**Overpass query:**
```
[out:json][timeout:60];
(
  way["amenity"="parking"]["parking"="surface"](35.9,-96.1,36.4,-95.7);
  relation["amenity"="parking"]["parking"="surface"](35.9,-96.1,36.4,-95.7);
);
out geom;
```

**Coordinate conversion:**
- OSM way: geometry comes as `[{ "lat": ..., "lon": ... }, ...]` — map to `[[lon, lat], ...]`
- OSM relation: outer member ways provide the outer ring — use the first outer member's geometry
- Ensure the ring is closed (first and last coordinate identical)

### Rake task: `lib/tasks/parking.rake`

```
rails parking:import_osm
```

Instantiates `ParkingLotImporter`, calls `#import`, prints the result summary. No other logic.

## Out of Scope

- Updating existing OSM lots when their coordinates change (skip for now)
- Importing other OSM parking tags (covered lots, garages, on-street)
- Scheduling or automation
- UI trigger
- Other data sources (future sub-projects)
