# Incident Form Two-Column Layout

## Overview

Redesign the incident creation form (`new.html.erb`) into a persistent two-column layout: left column holds the form (plus article text above it when scraping), right column holds a full-height interactive map with a places search overlay. This applies to both the regular new form and the post-scrape form.

## Layout

`new.html.erb` always renders two columns — the `incident-form-grid--single` modifier is removed. A new `incident-form` Stimulus bridge controller wraps the outer grid.

```
[header]
[data-controller="incident-form"]
  ├── Left column (scrollable, overflow-y: auto, max-height: 100vh)
  │     ├── Article panel — only when @article_text present (stacked above form)
  │     └── Incident form (no geocode widget, no inline map)
  └── Right column (position: sticky, top: 0, height: 100vh, overflow: hidden)
        └── [data-controller="map geocode-lookup"] (map element)
              ├── Search overlay (position: absolute, top/left/right with z-index: 10)
              │     ├── text input (geocode-lookup input target)
              │     └── results dropdown (geocode-lookup results target)
              └── Map container div (map container target)
```

The right column's map element has both `map` and `geocode-lookup` controllers on it — identical to today's setup — so the existing geocode→map event chain works without changes to `map_controller.ts`.

## Form Changes (`_form.html.erb`)

- Remove `render 'shared/location_lookup'`
- Replace with:
  - Plain text field for `location_description` — no geocoding, just a descriptive field. Has `data-incident-form-target="locationField"`.
  - Read-only text input for `latitude` — `data-incident-form-target="latField"`, populated by bridge, submitted at 2dp precision.
  - Read-only text input for `longitude` — `data-incident-form-target="lngField"`, same.

## Controller Architecture

### New: `incident_form_controller.ts`

Sits on the outer grid wrapper. Bridges the right-column map and the left-column form fields.

Targets: `locationField`, `latField`, `lngField`

Event handling:
- `geocode-lookup:coordinatesSelected` (bubbles up from right column): writes `event.detail.displayName` to `locationField`
- `map:markerMoved` (bubbles up from right column): writes `event.detail.latitude.toFixed(2)` and `event.detail.longitude.toFixed(2)` to `latField` and `lngField`

Behavior rules:
- Manual pin click → only `map:markerMoved` fires → lat/lng update, `locationField` untouched
- Search result selected → `geocode-lookup:coordinatesSelected` fires (updates `locationField`), map places marker, `map:markerMoved` fires (updates lat/lng)
- If user typed a description manually before pinning, manual pin movement does not overwrite it

### Modified: `geocode_lookup_controller.ts`

Make `latitudeField` and `longitudeField` targets optional. Guard all access with `hasLatitudeFieldTarget` / `hasLongitudeFieldTarget`. The overlay search won't have those targets; the bridge controller owns all form field updates.

### Unchanged: `map_controller.ts`

No changes required.

## CSS Changes

### `incident-form-grid`
- Always 2-column (`grid-template-columns: minmax(300px, 600px) 1fr`)
- Remove `incident-form-grid--single` modifier and its rule

### Left column
- `overflow-y: auto`
- `max-height: 100vh`

### Right column
- `position: sticky`
- `top: 0`
- `height: 100vh`
- `overflow: hidden`

### Map search overlay
- `position: absolute; top: 1rem; left: 1rem; right: 4rem; z-index: 10`
- Keeps clear of Mapbox navigation controls (top-right)
- Input spans full overlay width
- Results dropdown below input, max-height with overflow-y: auto

### Map container
- `position: relative` (so overlay positions against it)
- `width: 100%; height: 100%`

### Form field input min-width
- Remove the global `min-width: 500px` on `.field input` within the incident form column — the column width constrains it instead

### Article panel
- Moved to top of left column; existing styles unchanged
- Scrolls with the left column

## Data Flow Summary

```
User types in search overlay
  → geocode-lookup controller calls /api/v1/geocode
  → results shown in dropdown

User selects result
  → geocode-lookup dispatches coordinatesSelected {lat, lng, displayName}
  → map controller (ancestor) catches it → places marker, flies map
  → map controller dispatches markerMoved {lat, lng}
  → incident-form bridge catches coordinatesSelected → updates locationField
  → incident-form bridge catches markerMoved → updates latField, lngField (2dp)

User clicks map manually (no search)
  → map controller dispatches markerMoved {lat, lng}
  → incident-form bridge catches markerMoved → updates latField, lngField (2dp)
  → locationField unchanged
```

## Files Changed

- `app/views/incidents/new.html.erb` — two-column layout, bridge controller, map in right column
- `app/views/incidents/_form.html.erb` — remove location_lookup, add plain location_description + readonly lat/lng
- `app/javascript/controllers/incident_form_controller.ts` — new bridge controller
- `app/javascript/controllers/geocode_lookup_controller.ts` — make lat/lng targets optional
- `app/javascript/controllers/index.ts` — register new controller
- `app/assets/stylesheets/dashboard.css` — layout CSS updates
