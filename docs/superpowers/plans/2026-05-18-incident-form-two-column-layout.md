# Incident Form Two-Column Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the incident creation form into a persistent two-column layout with a scrollable form on the left and a full-height interactive map with search overlay on the right.

**Architecture:** A new `incident-form` Stimulus controller on the layout wrapper acts as a bridge — it catches `geocode-lookup:coordinatesSelected` events bubbling from the right-column map to update the location description field, and catches `map:markerMoved` events to update the lat/lng fields. The right column reuses the existing `map` and `geocode-lookup` controllers together, preserving their existing event chain.

**Tech Stack:** Rails 8 ERB views, Stimulus TypeScript controllers, Mapbox GL JS, plain CSS

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `app/javascript/controllers/incident_form_controller.ts` | Bridge controller: catches map events and updates form fields |
| Modify | `app/javascript/controllers/geocode_lookup_controller.ts` | Make `latitudeField`/`longitudeField` targets optional |
| Modify | `app/views/incidents/new.html.erb` | Two-column layout with bridge controller and map column |
| Modify | `app/views/incidents/_form.html.erb` | Remove location_lookup partial; add plain location + readonly lat/lng fields |
| Modify | `app/assets/stylesheets/dashboard.css` | Layout, sticky columns, map overlay styles |
| Create | `test/controllers/incidents_new_layout_test.rb` | Integration tests for new HTML structure |

> **Note:** `index.ts` does NOT need changes. Controllers are auto-registered via `require.context` — any file matching `*_controller.ts` in the directory is picked up automatically.

---

### Task 1: Write failing integration tests for the new layout

**Files:**
- Create: `test/controllers/incidents_new_layout_test.rb`

- [ ] **Step 1: Create the test file**

```ruby
require "test_helper"

class IncidentsNewLayoutTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  setup do
    @user = User.create!(email: "layouttest@example.com", password: "password123", username: "layouttester")
    sign_in @user
  end

  teardown do
    @user.destroy
  end

  test "new incident page has two-column layout with bridge controller" do
    get new_incident_path
    assert_response :success
    assert_select "[data-controller~='incident-form']", count: 1
    assert_select ".incident-form-column--left", count: 1
    assert_select ".incident-form-column--map", count: 1
  end

  test "new incident page map column has search overlay and map container" do
    get new_incident_path
    assert_response :success
    assert_select ".map-search-overlay", count: 1
    assert_select "[data-map-target='container']", count: 1
  end

  test "new incident form has plain location description field with bridge target" do
    get new_incident_path
    assert_response :success
    assert_select "input[name='incident[location_description]'][data-incident-form-target='locationField']"
  end

  test "new incident form has readonly lat and lng fields with bridge targets" do
    get new_incident_path
    assert_response :success
    assert_select "input[name='incident[latitude]'][readonly]"
    assert_select "input[name='incident[longitude]'][readonly]"
  end

  test "new incident page without article text shows no article panel" do
    get new_incident_path
    assert_response :success
    assert_select ".article-panel", count: 0
  end
end
```

- [ ] **Step 2: Run the tests to confirm they all fail**

```bash
rails test test/controllers/incidents_new_layout_test.rb
```

Expected: all 5 tests FAIL — the current view has none of this structure.

---

### Task 2: Patch `geocode_lookup_controller.ts` to make lat/lng targets optional

The overlay search won't have `latitudeField`/`longitudeField` targets. Accessing `this.latitudeFieldTarget` when the target doesn't exist throws a Stimulus error. Guard every access with `has*Target` checks.

**Files:**
- Modify: `app/javascript/controllers/geocode_lookup_controller.ts`

- [ ] **Step 1: Replace the file contents**

```typescript
import { Controller } from "@hotwired/stimulus"

interface GeocodeResult {
  latitude: number
  longitude: number
  display_name: string
}

export default class extends Controller {
  static targets = ["input", "latitudeField", "longitudeField", "results", "displayName"]
  static values = {
    apiUrl: { type: String, default: "/api/v1/geocode" }
  }

  declare readonly inputTarget: HTMLInputElement
  declare readonly hasLatitudeFieldTarget: boolean
  declare readonly hasLongitudeFieldTarget: boolean
  declare readonly latitudeFieldTarget: HTMLInputElement
  declare readonly longitudeFieldTarget: HTMLInputElement
  declare readonly resultsTarget: HTMLElement
  declare readonly hasResultsTarget: boolean
  declare readonly hasDisplayNameTarget: boolean
  declare readonly displayNameTarget?: HTMLElement
  declare readonly apiUrlValue: string

  private debounceTimer?: number
  private markerMovedHandler = (event: Event) => {
    const customEvent = event as CustomEvent
    const { latitude, longitude } = customEvent.detail
    this.setCoordinates(latitude, longitude)
  }

  connect() {
    this.element.addEventListener('map:markerMoved', this.markerMovedHandler)
    this.loadExistingCoordinates()
  }

  private loadExistingCoordinates() {
    if (!this.hasLatitudeFieldTarget || !this.hasLongitudeFieldTarget) return

    setTimeout(() => {
      if (this.latitudeFieldTarget.value && this.longitudeFieldTarget.value) {
        const lat = parseFloat(this.latitudeFieldTarget.value)
        const lng = parseFloat(this.longitudeFieldTarget.value)

        if (!isNaN(lat) && !isNaN(lng)) {
          this.dispatch("coordinatesSelected", {
            detail: { latitude: lat, longitude: lng }
          })
        }
      }
    }, 100)
  }

  disconnect() {
    this.element.removeEventListener('map:markerMoved', this.markerMovedHandler)

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
  }

  search() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    const query = this.inputTarget.value.trim()

    if (query.length < 3) {
      this.clearResults()
      return
    }

    this.debounceTimer = window.setTimeout(() => {
      this.performSearch(query)
    }, 500)
  }

  private async performSearch(query: string) {
    try {
      const response = await fetch(`${this.apiUrlValue}?q=${encodeURIComponent(query)}`)

      if (!response.ok) {
        throw new Error(`Geocode request failed: ${response.statusText}`)
      }

      const results: GeocodeResult[] = await response.json()
      this.displayResults(results)
    } catch (error) {
      console.error("Geocoding error:", error)
      this.showError("Unable to geocode address. Please try again.")
    }
  }

  private displayResults(results: GeocodeResult[]) {
    if (!this.hasResultsTarget) return

    if (results.length === 0) {
      this.resultsTarget.innerHTML = '<div class="geocode-result-item">No results found</div>'
      this.resultsTarget.classList.remove('hidden')
      return
    }

    this.resultsTarget.innerHTML = results.map((result, index) => `
      <div class="geocode-result-item" data-action="click->geocode-lookup#selectResult" data-index="${index}" data-lat="${result.latitude}" data-lng="${result.longitude}" data-name="${this.escapeHtml(result.display_name)}">
        ${this.escapeHtml(result.display_name)}
      </div>
    `).join('')

    this.resultsTarget.classList.remove('hidden')
  }

  selectResult(event: Event) {
    const element = event.currentTarget as HTMLElement
    const lat = element.dataset.lat
    const lng = element.dataset.lng
    const name = element.dataset.name

    if (lat && lng) {
      this.setCoordinates(parseFloat(lat), parseFloat(lng), name)
    }

    this.clearResults()
  }

  setCoordinates(lat: number, lng: number, displayName?: string) {
    if (this.hasLatitudeFieldTarget && this.hasLongitudeFieldTarget) {
      const currentLat = parseFloat(this.latitudeFieldTarget.value)
      const currentLng = parseFloat(this.longitudeFieldTarget.value)

      this.latitudeFieldTarget.value = lat.toString()
      this.longitudeFieldTarget.value = lng.toString()

      if (displayName && this.hasDisplayNameTarget && this.displayNameTarget) {
        this.displayNameTarget.textContent = `Selected: ${displayName}`
        this.displayNameTarget.classList.remove('hidden')
      }

      if (currentLat !== lat || currentLng !== lng) {
        this.dispatch("coordinatesSelected", {
          detail: { latitude: lat, longitude: lng, displayName }
        })
      }
    } else {
      this.dispatch("coordinatesSelected", {
        detail: { latitude: lat, longitude: lng, displayName }
      })
    }
  }

  updateMapFromFields() {
    if (!this.hasLatitudeFieldTarget || !this.hasLongitudeFieldTarget) return

    const lat = parseFloat(this.latitudeFieldTarget.value)
    const lng = parseFloat(this.longitudeFieldTarget.value)

    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      this.dispatch("coordinatesSelected", {
        detail: { latitude: lat, longitude: lng }
      })
    }
  }

  clearResults() {
    if (this.hasResultsTarget) {
      this.resultsTarget.innerHTML = ''
      this.resultsTarget.classList.add('hidden')
    }
  }

  private showError(message: string) {
    if (this.hasResultsTarget) {
      this.resultsTarget.innerHTML = `<div class="geocode-result-item error">${message}</div>`
      this.resultsTarget.classList.remove('hidden')
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}
```

- [ ] **Step 2: Build to verify TypeScript compiles**

```bash
cd /path/to/app && webpack --config webpack.config.js 2>&1 | head -30
```

Expected: no TypeScript errors.

---

### Task 3: Create the `incident_form_controller.ts` bridge controller

**Files:**
- Create: `app/javascript/controllers/incident_form_controller.ts`

- [ ] **Step 1: Create the file**

```typescript
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["locationField", "latField", "lngField"]

  declare readonly locationFieldTarget: HTMLInputElement
  declare readonly latFieldTarget: HTMLInputElement
  declare readonly lngFieldTarget: HTMLInputElement

  handleSearchSelection(event: Event) {
    const customEvent = event as CustomEvent
    const { displayName } = customEvent.detail
    if (displayName) {
      this.locationFieldTarget.value = displayName
    }
  }

  handleMarkerMoved(event: Event) {
    const customEvent = event as CustomEvent
    const { latitude, longitude } = customEvent.detail
    this.latFieldTarget.value = parseFloat(latitude).toFixed(2)
    this.lngFieldTarget.value = parseFloat(longitude).toFixed(2)
  }
}
```

- [ ] **Step 2: Build to verify TypeScript compiles**

```bash
webpack --config webpack.config.js 2>&1 | head -30
```

Expected: no TypeScript errors. The controller auto-registers as `incident-form` via the `require.context` in `index.ts`.

---

### Task 4: Update `new.html.erb` to the two-column layout

**Files:**
- Modify: `app/views/incidents/new.html.erb`

- [ ] **Step 1: Replace the file contents**

```erb
<% content_for :head do %>
  <link href='https://api.mapbox.com/mapbox-gl-js/v3.11.0/mapbox-gl.css' rel='stylesheet' />
  <meta name="mapbox-token" content="<%= ENV['MAPBOX_ACCESS_TOKEN'] %>">
  <meta name="mapbox-style" content="<%= ENV['MAPBOX_STYLE'] %>">
<% end %>

<div class="incident-form-layout"
     data-controller="incident-form"
     data-action="geocode-lookup:coordinatesSelected->incident-form#handleSearchSelection map:markerMoved->incident-form#handleMarkerMoved">
  <%= render 'shared/header' do %>
    <%= link_to 'Scrape From Article', scrape_new_incidents_path, class: 'link' %>
    <%= link_to 'Back to Incidents', incidents_path, class: 'link' %>
  <% end %>

  <div class="incident-form-grid">
    <div class="incident-form-column incident-form-column--left">
      <% if @article_text.present? %>
        <div class="article-panel">
          <h2>Article Text</h2>
          <div class="article-text"><%= @article_text %></div>
        </div>
      <% end %>
      <%= render 'form', incident: @incident %>
    </div>

    <div class="incident-form-column incident-form-column--map">
      <div class="incident-map-container"
           data-controller="map geocode-lookup"
           data-map-interactive-value="true">
        <div class="map-search-overlay">
          <input type="text"
                 class="map-search-input"
                 placeholder="Search location..."
                 data-geocode-lookup-target="input"
                 data-action="input->geocode-lookup#search"
                 autocomplete="off" />
          <div class="map-search-results hidden" data-geocode-lookup-target="results"></div>
        </div>
        <div id="incident-location-map"
             data-map-target="container"
             class="map-fullscreen"></div>
      </div>
    </div>
  </div>
</div>
```

---

### Task 5: Update `_form.html.erb` — remove location lookup, add plain fields

**Files:**
- Modify: `app/views/incidents/_form.html.erb`

- [ ] **Step 1: Replace the `render 'shared/location_lookup'` line with plain fields**

Find this block in the file (currently line 18):
```erb
  <%= render 'shared/location_lookup', form: form, show_map: true %>
```

Replace it with:
```erb
  <div class="field">
    <%= form.label :location_description, "Cross Streets / Address" %>
    <%= form.text_field :location_description,
        data: { "incident-form-target": "locationField" },
        placeholder: "e.g., 51st and Yale" %>
  </div>

  <div class="coordinates">
    <div class="field">
      <%= form.label :latitude %>
      <%= form.text_field :latitude,
          id: "incident_latitude",
          readonly: true,
          data: { "incident-form-target": "latField" } %>
    </div>
    <div class="field">
      <%= form.label :longitude %>
      <%= form.text_field :longitude,
          id: "incident_longitude",
          readonly: true,
          data: { "incident-form-target": "lngField" } %>
    </div>
  </div>
```

---

### Task 6: Update CSS in `dashboard.css`

**Files:**
- Modify: `app/assets/stylesheets/dashboard.css`

- [ ] **Step 1: Update `.incident-form-layout` to be a full-height flex container**

Find:
```css
.incident-form-layout {
  width: 100%;
  min-height: 100vh;
}
```

Replace with:
```css
.incident-form-layout {
  width: 100%;
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
}
```

- [ ] **Step 2: Update `.incident-form-grid` to always be 2-column and fill remaining height**

Find:
```css
.incident-form-grid {
  display: grid;
  grid-template-columns: minmax(300px, 800px) 1fr;
  gap: 2rem;
  padding: 2rem;
  max-width: 1600px;
  margin: 0 auto;
}
```

Replace with:
```css
.incident-form-grid {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(300px, 600px) 1fr;
  min-height: 0;
  overflow: hidden;
}
```

- [ ] **Step 3: Remove the `--single` modifier rule**

Find and delete these two rules entirely:
```css
.incident-form-grid--single {
  grid-template-columns: minmax(300px, 800px);
  justify-content: center;
}
```

- [ ] **Step 4: Add left column styles**

After the `.incident-form-column` rule block, add:
```css
.incident-form-column--left {
  overflow-y: auto;
  padding: 2rem;
}
```

- [ ] **Step 5: Add map column and map container styles**

After `.incident-form-column--left`, add:
```css
.incident-form-column--map {
  overflow: hidden;
  position: relative;
}

.incident-map-container {
  width: 100%;
  height: 100%;
  position: relative;
}
```

- [ ] **Step 6: Add map search overlay styles**

After `.incident-map-container`, add:
```css
.map-search-overlay {
  position: absolute;
  top: 1rem;
  left: 1rem;
  right: 4rem;
  z-index: 10;
}

.map-search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-family: var(--body-font);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  background: var(--white);
}

.map-search-results {
  background: var(--white);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  max-height: 200px;
  overflow-y: auto;
  margin-top: 0.25rem;
}

.map-search-results .geocode-result-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  font-size: 0.9rem;
  border-bottom: 1px solid var(--palegray);
}

.map-search-results .geocode-result-item:last-child {
  border-bottom: none;
}

.map-search-results .geocode-result-item:hover {
  background-color: var(--quaternary-color);
}
```

---

### Task 7: Run tests and commit

**Files:** none

- [ ] **Step 1: Run the layout tests**

```bash
rails test test/controllers/incidents_new_layout_test.rb
```

Expected: all 5 tests PASS.

- [ ] **Step 2: Run the full test suite to check for regressions**

```bash
rails test
```

Expected: all existing tests still pass.

- [ ] **Step 3: Build assets and verify no compile errors**

```bash
webpack --config webpack.config.js
```

Expected: clean build with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add \
  app/views/incidents/new.html.erb \
  app/views/incidents/_form.html.erb \
  app/javascript/controllers/incident_form_controller.ts \
  app/javascript/controllers/geocode_lookup_controller.ts \
  app/assets/stylesheets/dashboard.css \
  test/controllers/incidents_new_layout_test.rb
git commit -m "Redesign incident form with two-column layout and map overlay search"
```
