# Parking Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public parking-only map of Tulsa and an authenticated editor for collaboratively digitizing surface parking lot polygons.

**Architecture:** A `ParkingLot` model stores polygon coordinates as JSONB. A public view (`/parking`) renders all lots as an amber fill layer on a minimal blank map with an optional faint streets toggle. An authenticated editor (`/parking/edit`) uses Mapbox Draw over satellite imagery for polygon contribution with auto-save.

**Tech Stack:** Rails 8, Devise, Mapbox GL JS v3, `@mapbox/mapbox-gl-draw`, Stimulus (TypeScript), minitest

---

## File Map

| Action | Path |
|--------|------|
| Create | `db/migrate/20260615000001_create_parking_lots.rb` |
| Create | `app/models/parking_lot.rb` |
| Create | `test/models/parking_lot_test.rb` |
| Create | `test/fixtures/parking_lots.yml` |
| Modify | `config/routes.rb` |
| Create | `app/controllers/parking_lots_controller.rb` |
| Create | `app/controllers/api/v1/parking_lots_controller.rb` |
| Create | `test/controllers/parking_lots_controller_test.rb` |
| Create | `test/controllers/api/v1/parking_lots_controller_test.rb` |
| Create | `app/views/parking_lots/index.html.erb` |
| Create | `app/views/parking_lots/edit.html.erb` |
| Create | `app/javascript/controllers/parking_map_controller.ts` |
| Create | `app/javascript/controllers/parking_editor_controller.ts` |
| Modify | `app/javascript/controllers/index.ts` |

---

## Task 1: Install Mapbox Draw

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
bun add @mapbox/mapbox-gl-draw @types/mapbox__mapbox-gl-draw
```

- [ ] **Step 2: Verify it appears in package.json**

```bash
grep mapbox-gl-draw package.json
```

Expected output includes `"@mapbox/mapbox-gl-draw"` and `"@types/mapbox__mapbox-gl-draw"`.

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lockb
git commit -m "feat: add mapbox-gl-draw dependency"
```

---

## Task 2: ParkingLot model and migration

**Files:**
- Create: `db/migrate/20260615000001_create_parking_lots.rb`
- Create: `app/models/parking_lot.rb`
- Create: `test/models/parking_lot_test.rb`
- Create: `test/fixtures/parking_lots.yml`

- [ ] **Step 1: Write the failing model test**

`test/models/parking_lot_test.rb`:
```ruby
require "test_helper"

class ParkingLotTest < ActiveSupport::TestCase
  def setup
    @user = users(:one)
    @coords = [[-95.99, 36.15], [-95.98, 36.15], [-95.98, 36.16], [-95.99, 36.16], [-95.99, 36.15]]
    @lot = ParkingLot.new(user: @user, coordinates: @coords)
  end

  test "valid with coordinates and user" do
    assert @lot.valid?
  end

  test "invalid without coordinates" do
    @lot.coordinates = nil
    assert_not @lot.valid?
  end

  test "invalid without user" do
    @lot.user = nil
    assert_not @lot.valid?
  end

  test "to_geojson_feature returns a valid GeoJSON Feature" do
    @lot.save!
    feature = @lot.to_geojson_feature
    assert_equal "Feature", feature[:type]
    assert_equal "Polygon", feature[:geometry][:type]
    assert_equal [@coords], feature[:geometry][:coordinates]
    assert_equal @lot.id, feature[:properties][:id]
  end
end
```

- [ ] **Step 2: Run to confirm it fails**

```bash
rails test test/models/parking_lot_test.rb
```

Expected: error about uninitialized constant `ParkingLot`.

- [ ] **Step 3: Create the migration**

`db/migrate/20260615000001_create_parking_lots.rb`:
```ruby
class CreateParkingLots < ActiveRecord::Migration[8.0]
  def change
    create_table :parking_lots do |t|
      t.jsonb :coordinates, null: false
      t.references :user, null: false, foreign_key: true
      t.timestamps
    end
  end
end
```

- [ ] **Step 4: Run the migration**

```bash
rails db:migrate
```

- [ ] **Step 5: Create the model**

`app/models/parking_lot.rb`:
```ruby
class ParkingLot < ApplicationRecord
  belongs_to :user

  validates :coordinates, presence: true

  def to_geojson_feature
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [coordinates]
      },
      properties: {
        id: id
      }
    }
  end
end
```

- [ ] **Step 6: Add a fixture**

`test/fixtures/parking_lots.yml`:
```yaml
one:
  user: one
  coordinates:
    - [-95.99, 36.15]
    - [-95.98, 36.15]
    - [-95.98, 36.16]
    - [-95.99, 36.16]
    - [-95.99, 36.15]
```

- [ ] **Step 7: Run tests to confirm they pass**

```bash
rails test test/models/parking_lot_test.rb
```

Expected: 4 tests, 0 failures.

- [ ] **Step 8: Commit**

```bash
git add db/migrate/20260615000001_create_parking_lots.rb app/models/parking_lot.rb test/models/parking_lot_test.rb test/fixtures/parking_lots.yml db/schema.rb
git commit -m "feat: add ParkingLot model and migration"
```

---

## Task 3: Routes

**Files:**
- Modify: `config/routes.rb`

- [ ] **Step 1: Add routes**

In `config/routes.rb`, add these two blocks. The web routes go at the top level; the API routes go inside the existing `namespace :api` / `namespace :v1` block alongside the other API routes:

```ruby
# Top-level web routes (add near other top-level get routes)
get "parking", to: "parking_lots#index"
get "parking/edit", to: "parking_lots#edit"
```

```ruby
# Inside namespace :api do / namespace :v1 do
get "parking_lots/geojson", to: "parking_lots#geojson"
resources :parking_lots, only: [:create, :update, :destroy]
```

- [ ] **Step 2: Verify routes exist**

```bash
rails routes | grep parking
```

Expected output includes:
```
         parking GET  /parking(.:format)                    parking_lots#index
    parking_edit GET  /parking/edit(.:format)               parking_lots#edit
                 GET  /api/v1/parking_lots/geojson(.:format) api/v1/parking_lots#geojson
  api_v1_parking POST /api/v1/parking_lots(.:format)        api/v1/parking_lots#create
                PATCH /api/v1/parking_lots/:id(.:format)    api/v1/parking_lots#update
                      DELETE /api/v1/parking_lots/:id(.:format)  api/v1/parking_lots#destroy
```

- [ ] **Step 3: Commit**

```bash
git add config/routes.rb
git commit -m "feat: add parking lot routes"
```

---

## Task 4: Web controller

**Files:**
- Create: `app/controllers/parking_lots_controller.rb`
- Create: `test/controllers/parking_lots_controller_test.rb`

- [ ] **Step 1: Write the failing tests**

`test/controllers/parking_lots_controller_test.rb`:
```ruby
require "test_helper"

class ParkingLotsControllerTest < ActionDispatch::IntegrationTest
  test "index is publicly accessible" do
    get parking_path
    assert_response :success
  end

  test "edit redirects to sign in when not authenticated" do
    get parking_edit_path
    assert_redirected_to new_user_session_path
  end

  test "edit is accessible when signed in" do
    sign_in users(:one)
    get parking_edit_path
    assert_response :success
  end
end
```

- [ ] **Step 2: Run to confirm they fail**

```bash
rails test test/controllers/parking_lots_controller_test.rb
```

Expected: errors about missing controller or routes.

- [ ] **Step 3: Create the controller**

`app/controllers/parking_lots_controller.rb`:
```ruby
class ParkingLotsController < ApplicationController
  before_action :authenticate_user!, only: [:edit]

  def index
  end

  def edit
  end
end
```

- [ ] **Step 4: Create stub views so the tests can render**

```bash
mkdir -p app/views/parking_lots
touch app/views/parking_lots/index.html.erb
touch app/views/parking_lots/edit.html.erb
```

- [ ] **Step 5: Add Devise test helper to test_helper.rb**

Open `test/test_helper.rb` and add inside `class ActiveSupport::TestCase`:

```ruby
include Devise::Test::IntegrationHelpers
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
rails test test/controllers/parking_lots_controller_test.rb
```

Expected: 3 tests, 0 failures.

- [ ] **Step 7: Commit**

```bash
git add app/controllers/parking_lots_controller.rb app/views/parking_lots/index.html.erb app/views/parking_lots/edit.html.erb test/controllers/parking_lots_controller_test.rb test/test_helper.rb
git commit -m "feat: add ParkingLotsController with auth gate"
```

---

## Task 5: API controller

**Files:**
- Create: `app/controllers/api/v1/parking_lots_controller.rb`
- Create: `test/controllers/api/v1/parking_lots_controller_test.rb`

- [ ] **Step 1: Write the failing tests**

```bash
mkdir -p test/controllers/api/v1
```

`test/controllers/api/v1/parking_lots_controller_test.rb`:
```ruby
require "test_helper"

class Api::V1::ParkingLotsControllerTest < ActionDispatch::IntegrationTest
  def coords
    [[-95.99, 36.15], [-95.98, 36.15], [-95.98, 36.16], [-95.99, 36.16], [-95.99, 36.15]]
  end

  test "geojson is publicly accessible and returns FeatureCollection" do
    get api_v1_parking_lots_geojson_path, as: :json
    assert_response :success
    body = response.parsed_body
    assert_equal "FeatureCollection", body["type"]
    assert body.key?("features")
  end

  test "create requires authentication" do
    post api_v1_parking_lots_path, params: { coordinates: coords }, as: :json
    assert_response :unauthorized
  end

  test "create saves a new parking lot and returns GeoJSON feature" do
    sign_in users(:one)
    assert_difference "ParkingLot.count", 1 do
      post api_v1_parking_lots_path, params: { coordinates: coords }, as: :json
    end
    assert_response :created
    body = response.parsed_body
    assert_equal "Feature", body["type"]
    assert_equal "Polygon", body["geometry"]["type"]
  end

  test "update changes coordinates" do
    sign_in users(:one)
    lot = parking_lots(:one)
    new_coords = [[-96.0, 36.2], [-95.9, 36.2], [-95.9, 36.3], [-96.0, 36.3], [-96.0, 36.2]]
    patch api_v1_parking_lot_path(lot), params: { coordinates: new_coords }, as: :json
    assert_response :success
    assert_equal new_coords, lot.reload.coordinates
  end

  test "destroy removes the parking lot" do
    sign_in users(:one)
    lot = parking_lots(:one)
    assert_difference "ParkingLot.count", -1 do
      delete api_v1_parking_lot_path(lot), as: :json
    end
    assert_response :no_content
  end

  test "destroy requires authentication" do
    lot = parking_lots(:one)
    delete api_v1_parking_lot_path(lot), as: :json
    assert_response :unauthorized
  end
end
```

- [ ] **Step 2: Run to confirm they fail**

```bash
rails test test/controllers/api/v1/parking_lots_controller_test.rb
```

Expected: errors about missing controller.

- [ ] **Step 3: Create the controller**

`app/controllers/api/v1/parking_lots_controller.rb`:
```ruby
class Api::V1::ParkingLotsController < ApplicationController
  before_action :authenticate_user!, except: [:geojson]
  before_action :set_parking_lot, only: [:update, :destroy]

  def geojson
    lots = ParkingLot.all
    render json: {
      type: "FeatureCollection",
      features: lots.map(&:to_geojson_feature)
    }
  end

  def create
    lot = current_user.parking_lots.build(coordinates: params[:coordinates])
    if lot.save
      render json: lot.to_geojson_feature, status: :created
    else
      render json: { errors: lot.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    if @parking_lot.update(coordinates: params[:coordinates])
      render json: @parking_lot.to_geojson_feature
    else
      render json: { errors: @parking_lot.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @parking_lot.destroy
    head :no_content
  end

  private

  def set_parking_lot
    @parking_lot = ParkingLot.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: { error: "Not found" }, status: :not_found
  end
end
```

- [ ] **Step 4: Add `has_many :parking_lots` to the User model**

Open `app/models/user.rb` and add:

```ruby
has_many :parking_lots, dependent: :destroy
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
rails test test/controllers/api/v1/parking_lots_controller_test.rb
```

Expected: 6 tests, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add app/controllers/api/v1/parking_lots_controller.rb test/controllers/api/v1/parking_lots_controller_test.rb app/models/user.rb
git commit -m "feat: add Api::V1::ParkingLotsController with CRUD and GeoJSON"
```

---

## Task 6: Public view

**Files:**
- Modify: `app/views/parking_lots/index.html.erb`

- [ ] **Step 1: Write the view**

`app/views/parking_lots/index.html.erb`:
```erb
<% content_for :head do %>
  <meta name="mapbox-token" content="<%= ENV['MAPBOX_ACCESS_TOKEN'] %>">
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.11.0/mapbox-gl.css" rel="stylesheet">
<% end %>

<div class="parking-public"
     data-controller="parking-map">
  <div id="parking-map"
       data-parking-map-target="container"
       style="position: fixed; top: 0; left: 0; width: 100%; height: 100%;"></div>

  <div style="position: fixed; top: 1rem; left: 1rem; z-index: 1; display: flex; flex-direction: column; gap: 0.5rem;">
    <h1 style="margin: 0; font-size: 1rem; font-weight: 700; background: white; padding: 0.5rem 0.75rem; border-radius: 4px;">
      Tulsa Surface Parking
    </h1>
    <button data-action="parking-map#toggleStreets"
            data-parking-map-target="streetsButton"
            style="background: white; border: 1px solid #ccc; padding: 0.4rem 0.75rem; border-radius: 4px; cursor: pointer; font-size: 0.875rem; text-align: left;">
      Show streets
    </button>
  </div>
</div>
```

- [ ] **Step 2: Verify the page loads**

```bash
rails server
```

Visit `http://localhost:3000/parking` — the page should load without errors (map won't render yet; that comes in Task 8).

- [ ] **Step 3: Commit**

```bash
git add app/views/parking_lots/index.html.erb
git commit -m "feat: add parking public view"
```

---

## Task 7: Editor view

**Files:**
- Modify: `app/views/parking_lots/edit.html.erb`

- [ ] **Step 1: Write the view**

`app/views/parking_lots/edit.html.erb`:
```erb
<% content_for :head do %>
  <meta name="mapbox-token" content="<%= ENV['MAPBOX_ACCESS_TOKEN'] %>">
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.11.0/mapbox-gl.css" rel="stylesheet">
  <link rel="stylesheet" href="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.4.3/mapbox-gl-draw.css" type="text/css">
<% end %>

<div class="parking-editor"
     data-controller="parking-editor">
  <div id="parking-editor-map"
       data-parking-editor-target="container"
       style="position: fixed; top: 0; left: 0; width: 100%; height: 100%;"></div>

  <div style="position: fixed; top: 1rem; left: 1rem; z-index: 1; display: flex; flex-direction: column; gap: 0.5rem;">
    <p style="margin: 0; background: white; padding: 0.5rem 0.75rem; border-radius: 4px; font-size: 0.875rem;">
      Click the polygon tool to draw a parking lot. Click each corner, then double-click to close.
    </p>
    <button data-action="parking-editor#deleteSelected"
            data-parking-editor-target="deleteButton"
            disabled
            style="background: white; border: 1px solid #ccc; padding: 0.4rem 0.75rem; border-radius: 4px; cursor: pointer; font-size: 0.875rem; text-align: left;">
      Delete selected
    </button>
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add app/views/parking_lots/edit.html.erb
git commit -m "feat: add parking editor view"
```

---

## Task 8: parking_map_controller.ts (public view)

**Files:**
- Create: `app/javascript/controllers/parking_map_controller.ts`

- [ ] **Step 1: Create the controller**

`app/javascript/controllers/parking_map_controller.ts`:
```typescript
import { Controller } from "@hotwired/stimulus"
import mapboxgl from "mapbox-gl"

export default class extends Controller {
  static targets = ["container", "streetsButton"]

  declare readonly containerTarget: HTMLElement
  declare readonly streetsButtonTarget: HTMLButtonElement

  map: mapboxgl.Map | null = null
  streetsVisible: boolean = false

  connect() {
    const token = document.querySelector<HTMLMetaElement>('meta[name="mapbox-token"]')?.content
    if (!token) return

    mapboxgl.accessToken = token

    this.map = new mapboxgl.Map({
      container: this.containerTarget,
      style: "mapbox://styles/mapbox/empty-v9",
      center: [-95.9928, 36.154],
      zoom: 11
    })

    this.map.on("load", () => {
      this.addStreetsLayer()
      this.loadParkingLots()
    })
  }

  disconnect() {
    this.map?.remove()
  }

  private addStreetsLayer() {
    if (!this.map) return

    this.map.addSource("mapbox-streets", {
      type: "vector",
      url: "mapbox://mapbox.mapbox-streets-v8"
    })

    this.map.addLayer({
      id: "streets-layer",
      type: "line",
      source: "mapbox-streets",
      "source-layer": "road",
      paint: {
        "line-color": "#E5E7EB",
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.5, 15, 2]
      },
      layout: { visibility: "none" }
    })
  }

  private async loadParkingLots() {
    if (!this.map) return

    const response = await fetch("/api/v1/parking_lots/geojson")
    const geojson = await response.json()

    this.map.addSource("parking-lots", {
      type: "geojson",
      data: geojson
    })

    this.map.addLayer({
      id: "parking-lots-fill",
      type: "fill",
      source: "parking-lots",
      paint: {
        "fill-color": "#F59E0B",
        "fill-opacity": 0.85
      }
    })

    this.map.addLayer({
      id: "parking-lots-outline",
      type: "line",
      source: "parking-lots",
      paint: {
        "line-color": "#D97706",
        "line-width": 1
      }
    })
  }

  toggleStreets() {
    if (!this.map) return

    this.streetsVisible = !this.streetsVisible
    const visibility = this.streetsVisible ? "visible" : "none"
    this.map.setLayoutProperty("streets-layer", "visibility", visibility)
    this.streetsButtonTarget.textContent = this.streetsVisible ? "Hide streets" : "Show streets"
  }
}
```

- [ ] **Step 2: Register the controller (done in Task 10 — skip for now)**

- [ ] **Step 3: Build assets to check for TypeScript errors**

```bash
webpack --config webpack.config.js 2>&1 | head -40
```

Expected: build completes with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add app/javascript/controllers/parking_map_controller.ts
git commit -m "feat: add parking_map_controller for public view"
```

---

## Task 9: parking_editor_controller.ts (editor)

**Files:**
- Create: `app/javascript/controllers/parking_editor_controller.ts`

- [ ] **Step 1: Create the controller**

`app/javascript/controllers/parking_editor_controller.ts`:
```typescript
import { Controller } from "@hotwired/stimulus"
import mapboxgl from "mapbox-gl"
import MapboxDraw from "@mapbox/mapbox-gl-draw"

export default class extends Controller {
  static targets = ["container", "deleteButton"]

  declare readonly containerTarget: HTMLElement
  declare readonly deleteButtonTarget: HTMLButtonElement

  map: mapboxgl.Map | null = null
  draw: MapboxDraw | null = null
  selectedFeatureId: string | null = null
  featureToDbId: Map<string, number> = new Map()

  connect() {
    const token = document.querySelector<HTMLMetaElement>('meta[name="mapbox-token"]')?.content
    if (!token) return

    mapboxgl.accessToken = token

    this.map = new mapboxgl.Map({
      container: this.containerTarget,
      style: "mapbox://styles/mapbox/satellite-v9",
      center: [-95.9928, 36.154],
      zoom: 13
    })

    this.draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: false }
    })

    this.map.addControl(new mapboxgl.NavigationControl())
    this.map.addControl(this.draw)

    this.map.on("load", () => this.loadExistingLots())
    this.map.on("draw.create", (e: any) => this.handleCreate(e))
    this.map.on("draw.update", (e: any) => this.handleUpdate(e))
    this.map.on("draw.selectionchange", (e: any) => this.handleSelectionChange(e))
  }

  disconnect() {
    this.map?.remove()
  }

  private async loadExistingLots() {
    if (!this.draw) return

    const response = await fetch("/api/v1/parking_lots/geojson")
    const geojson = await response.json()

    geojson.features.forEach((feature: GeoJSON.Feature) => {
      const [drawId] = this.draw!.add(feature)
      if (feature.properties?.id) {
        this.featureToDbId.set(drawId, feature.properties.id)
      }
    })
  }

  private async handleCreate(e: { features: GeoJSON.Feature[] }) {
    const feature = e.features[0]
    if (!feature.geometry || feature.geometry.type !== "Polygon") return

    const coordinates = feature.geometry.coordinates[0]
    const drawId = feature.id as string

    const response = await fetch("/api/v1/parking_lots", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": this.csrfToken()
      },
      body: JSON.stringify({ coordinates })
    })

    if (response.ok) {
      const data = await response.json()
      this.featureToDbId.set(drawId, data.properties.id)
    }
  }

  private async handleUpdate(e: { features: GeoJSON.Feature[] }) {
    const feature = e.features[0]
    if (!feature.geometry || feature.geometry.type !== "Polygon") return

    const drawId = feature.id as string
    const dbId = this.featureToDbId.get(drawId)
    if (!dbId) return

    const coordinates = feature.geometry.coordinates[0]

    await fetch(`/api/v1/parking_lots/${dbId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": this.csrfToken()
      },
      body: JSON.stringify({ coordinates })
    })
  }

  private handleSelectionChange(e: { features: GeoJSON.Feature[] }) {
    if (e.features.length > 0) {
      this.selectedFeatureId = e.features[0].id as string
      this.deleteButtonTarget.disabled = false
    } else {
      this.selectedFeatureId = null
      this.deleteButtonTarget.disabled = true
    }
  }

  async deleteSelected() {
    if (!this.selectedFeatureId || !this.draw) return

    const dbId = this.featureToDbId.get(this.selectedFeatureId)

    if (dbId) {
      await fetch(`/api/v1/parking_lots/${dbId}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": this.csrfToken() }
      })
      this.featureToDbId.delete(this.selectedFeatureId)
    }

    this.draw.delete(this.selectedFeatureId)
    this.selectedFeatureId = null
    this.deleteButtonTarget.disabled = true
  }

  private csrfToken(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? ""
  }
}
```

- [ ] **Step 2: Build assets to check for TypeScript errors**

```bash
webpack --config webpack.config.js 2>&1 | head -40
```

Expected: build completes with no TypeScript errors. If you see `Cannot find module '@mapbox/mapbox-gl-draw'`, ensure Task 1 was completed and `node_modules` is current (`bun install`).

- [ ] **Step 3: Commit**

```bash
git add app/javascript/controllers/parking_editor_controller.ts
git commit -m "feat: add parking_editor_controller with Mapbox Draw auto-save"
```

---

## Task 10: Register Stimulus controllers

**Files:**
- Modify: `app/javascript/controllers/index.ts`

- [ ] **Step 1: Check how controllers are currently registered**

```bash
cat app/javascript/controllers/index.ts
```

- [ ] **Step 2: Register the two new controllers**

Add these two lines to `app/javascript/controllers/index.ts` following the same pattern as the existing registrations:

```typescript
import ParkingMapController from "./parking_map_controller"
import ParkingEditorController from "./parking_editor_controller"

// Add alongside existing application.register calls:
application.register("parking-map", ParkingMapController)
application.register("parking-editor", ParkingEditorController)
```

- [ ] **Step 3: Build and verify no errors**

```bash
webpack --config webpack.config.js 2>&1 | head -20
```

Expected: clean build.

- [ ] **Step 4: Smoke test both pages**

With `rails server` running:
- `http://localhost:3000/parking` — amber parking lots on white background, streets toggle button visible
- `http://localhost:3000/parking/edit` — redirects to sign in when not logged in; shows satellite map with Draw polygon tool when logged in

- [ ] **Step 5: Run the full test suite**

```bash
rails test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/javascript/controllers/index.ts
git commit -m "feat: register parking map and editor Stimulus controllers"
```
