# Parking OSM Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import surface parking lot polygons from OpenStreetMap into the `parking_lots` table via a rake task, idempotently, using the Overpass API.

**Architecture:** A migration adds `source` and `external_id` columns to `parking_lots` and makes `user_id` nullable. A `ParkingLotImporter` service handles the Overpass HTTP query, geometry conversion, and deduplication. A rake task wraps the service and prints a summary.

**Tech Stack:** Rails 7, minitest, Net::HTTP (stdlib), Overpass API

---

## File Map

| Action | Path |
|--------|------|
| Create | `db/migrate/20260616000001_add_source_tracking_to_parking_lots.rb` |
| Modify | `app/models/parking_lot.rb` |
| Modify | `test/fixtures/parking_lots.yml` |
| Create | `app/services/parking_lot_importer.rb` |
| Create | `test/services/parking_lot_importer_test.rb` |
| Create | `lib/tasks/parking.rake` |

---

## Task 1: Migration — add source tracking, make user_id nullable

**Files:**
- Create: `db/migrate/20260616000001_add_source_tracking_to_parking_lots.rb`

- [ ] **Step 1: Create the migration**

`db/migrate/20260616000001_add_source_tracking_to_parking_lots.rb`:
```ruby
class AddSourceTrackingToParkingLots < ActiveRecord::Migration[7.0]
  def change
    change_column_null :parking_lots, :user_id, true
    add_column :parking_lots, :source, :string
    add_column :parking_lots, :external_id, :string
    add_index :parking_lots, [:source, :external_id], unique: true,
              where: "source IS NOT NULL",
              name: "index_parking_lots_on_source_and_external_id"
  end
end
```

The partial index (`where: "source IS NOT NULL"`) ensures manually digitized lots with `nil` source don't conflict with each other.

- [ ] **Step 2: Run the migration**

```bash
rails db:migrate
```

Expected: migration runs without error, schema updated.

- [ ] **Step 3: Verify schema**

```bash
grep -A 15 'create_table "parking_lots"' db/schema.rb
```

Expected: shows `source`, `external_id` columns and `user_id` without `null: false`.

- [ ] **Step 4: Commit**

```bash
git add db/migrate/20260616000001_add_source_tracking_to_parking_lots.rb db/schema.rb
git commit -m "feat: add source tracking columns to parking_lots, make user_id nullable"
```

---

## Task 2: Update ParkingLot model and fixture

**Files:**
- Modify: `app/models/parking_lot.rb`
- Modify: `test/fixtures/parking_lots.yml`

- [ ] **Step 1: Make `belongs_to :user` optional**

`app/models/parking_lot.rb`:
```ruby
class ParkingLot < ApplicationRecord
  belongs_to :user, optional: true

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

- [ ] **Step 2: Add an OSM fixture entry**

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

osm_one:
  source: osm
  external_id: way/111111
  coordinates:
    - [-95.95, 36.12]
    - [-95.94, 36.12]
    - [-95.94, 36.13]
    - [-95.95, 36.13]
    - [-95.95, 36.12]
```

- [ ] **Step 3: Run existing model tests to confirm nothing broke**

```bash
rails test test/models/parking_lot_test.rb
```

Expected: 4 tests, 0 failures, 0 errors.

- [ ] **Step 4: Commit**

```bash
git add app/models/parking_lot.rb test/fixtures/parking_lots.yml
git commit -m "feat: make user_id optional on ParkingLot, add osm fixture"
```

---

## Task 3: ParkingLotImporter service

**Files:**
- Create: `app/services/parking_lot_importer.rb`
- Create: `test/services/parking_lot_importer_test.rb`

- [ ] **Step 1: Create the test directory**

```bash
mkdir -p test/services
```

- [ ] **Step 2: Write the failing tests**

`test/services/parking_lot_importer_test.rb`:
```ruby
require "test_helper"

class ParkingLotImporterTest < ActiveSupport::TestCase
  WAY_RESPONSE = {
    "elements" => [
      {
        "type" => "way",
        "id" => 999001,
        "geometry" => [
          { "lat" => 36.15, "lon" => -95.99 },
          { "lat" => 36.15, "lon" => -95.98 },
          { "lat" => 36.16, "lon" => -95.98 },
          { "lat" => 36.16, "lon" => -95.99 },
          { "lat" => 36.15, "lon" => -95.99 }
        ]
      }
    ]
  }.freeze

  RELATION_RESPONSE = {
    "elements" => [
      {
        "type" => "relation",
        "id" => 999002,
        "members" => [
          {
            "type" => "way",
            "role" => "outer",
            "geometry" => [
              { "lat" => 36.20, "lon" => -96.00 },
              { "lat" => 36.20, "lon" => -95.99 },
              { "lat" => 36.21, "lon" => -95.99 },
              { "lat" => 36.20, "lon" => -96.00 }
            ]
          }
        ]
      }
    ]
  }.freeze

  def stub_overpass(body)
    mock_response = Minitest::Mock.new
    mock_response.expect(:is_a?, true, [Net::HTTPSuccess])
    mock_response.expect(:body, body.to_json)
    Net::HTTP.stub(:post_form, mock_response) { yield }
  end

  test "imports a way element" do
    stub_overpass(WAY_RESPONSE) do
      assert_difference "ParkingLot.count", 1 do
        result = ParkingLotImporter.new.import
        assert_equal 1, result[:imported]
        assert_equal 0, result[:skipped]
        assert_equal 0, result[:failed]
      end
    end

    lot = ParkingLot.find_by(source: "osm", external_id: "way/999001")
    assert_not_nil lot
    assert_equal [[-95.99, 36.15], [-95.98, 36.15], [-95.98, 36.16], [-95.99, 36.16], [-95.99, 36.15]], lot.coordinates
  end

  test "skips already-imported way" do
    ParkingLot.create!(
      source: "osm",
      external_id: "way/999001",
      coordinates: [[-95.99, 36.15], [-95.98, 36.15], [-95.98, 36.16], [-95.99, 36.15]]
    )

    stub_overpass(WAY_RESPONSE) do
      assert_no_difference "ParkingLot.count" do
        result = ParkingLotImporter.new.import
        assert_equal 0, result[:imported]
        assert_equal 1, result[:skipped]
      end
    end
  end

  test "imports a relation element using outer member geometry" do
    stub_overpass(RELATION_RESPONSE) do
      assert_difference "ParkingLot.count", 1 do
        result = ParkingLotImporter.new.import
        assert_equal 1, result[:imported]
      end
    end

    lot = ParkingLot.find_by(source: "osm", external_id: "relation/999002")
    assert_not_nil lot
    assert_equal [[-96.00, 36.20], [-95.99, 36.20], [-95.99, 36.21], [-96.00, 36.20]], lot.coordinates
  end

  test "raises when Overpass returns an error status" do
    mock_response = Minitest::Mock.new
    mock_response.expect(:is_a?, false, [Net::HTTPSuccess])
    mock_response.expect(:code, "429")

    Net::HTTP.stub(:post_form, mock_response) do
      assert_raises(RuntimeError) { ParkingLotImporter.new.import }
    end
  end

  test "counts element with no geometry as failed, continues" do
    response = { "elements" => [{ "type" => "way", "id" => 1, "geometry" => [] }] }
    stub_overpass(response) do
      result = ParkingLotImporter.new.import
      assert_equal 0, result[:imported]
      assert_equal 1, result[:failed]
    end
  end
end
```

- [ ] **Step 3: Run to confirm they fail**

```bash
rails test test/services/parking_lot_importer_test.rb
```

Expected: errors about uninitialized constant `ParkingLotImporter`.

- [ ] **Step 4: Create the service**

`app/services/parking_lot_importer.rb`:
```ruby
require "net/http"
require "json"

class ParkingLotImporter
  OVERPASS_URL = "https://overpass-api.de/api/interpreter"
  QUERY = <<~OVERPASS
    [out:json][timeout:60];
    (
      way["amenity"="parking"]["parking"="surface"](35.9,-96.1,36.4,-95.7);
      relation["amenity"="parking"]["parking"="surface"](35.9,-96.1,36.4,-95.7);
    );
    out geom;
  OVERPASS

  def import
    elements = fetch_elements
    results = { imported: 0, skipped: 0, failed: 0 }
    elements.each { |element| process_element(element, results) }
    results
  end

  private

  def fetch_elements
    uri = URI(OVERPASS_URL)
    response = Net::HTTP.post_form(uri, data: QUERY)
    raise "Overpass API error: #{response.code}" unless response.is_a?(Net::HTTPSuccess)
    JSON.parse(response.body)["elements"]
  end

  def process_element(element, results)
    coords = extract_coordinates(element)
    if coords.nil? || coords.length < 4
      results[:failed] += 1
      return
    end

    external_id = "#{element["type"]}/#{element["id"]}"
    lot = ParkingLot.find_or_initialize_by(source: "osm", external_id: external_id)

    if lot.persisted?
      results[:skipped] += 1
    else
      lot.coordinates = coords
      lot.save!
      results[:imported] += 1
    end
  rescue => e
    results[:failed] += 1
  end

  def extract_coordinates(element)
    case element["type"]
    when "way"
      nodes = element["geometry"]
      return nil unless nodes&.any?
      coords = nodes.map { |n| [n["lon"], n["lat"]] }
      close_ring(coords)
    when "relation"
      outer = element["members"]&.find { |m| m["role"] == "outer" }
      return nil unless outer&.dig("geometry")&.any?
      coords = outer["geometry"].map { |n| [n["lon"], n["lat"]] }
      close_ring(coords)
    end
  end

  def close_ring(coords)
    coords << coords.first if coords.first != coords.last
    coords
  end
end
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
rails test test/services/parking_lot_importer_test.rb
```

Expected: 5 tests, 0 failures, 0 errors.

- [ ] **Step 6: Commit**

```bash
git add app/services/parking_lot_importer.rb test/services/parking_lot_importer_test.rb
git commit -m "feat: add ParkingLotImporter service with Overpass API integration"
```

---

## Task 4: Rake task

**Files:**
- Create: `lib/tasks/parking.rake`

- [ ] **Step 1: Create the rake task**

`lib/tasks/parking.rake`:
```ruby
namespace :parking do
  desc "Import surface parking lots from OpenStreetMap via Overpass API"
  task import_osm: :environment do
    results = ParkingLotImporter.new.import
    puts "Import complete: #{results[:imported]} imported, #{results[:skipped]} skipped, #{results[:failed]} failed"
  end
end
```

- [ ] **Step 2: Verify the task is registered**

```bash
rails parking:import_osm --dry-run 2>/dev/null || rails -T | grep parking
```

Expected: `parking:import_osm` listed.

- [ ] **Step 3: Run the full test suite**

```bash
rails test
```

Expected: all parking tests pass, no new failures.

- [ ] **Step 4: Commit**

```bash
git add lib/tasks/parking.rake
git commit -m "feat: add parking:import_osm rake task"
```
