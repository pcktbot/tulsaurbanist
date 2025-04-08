# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.0].define(version: 2025_04_08_224755) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "additional_informations", force: :cascade do |t|
    t.bigint "incident_id", null: false
    t.string "vehicle_types", default: [], array: true
    t.string "contributing_factors", default: [], array: true
    t.string "road_conditions"
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["incident_id"], name: "index_additional_informations_on_incident_id"
  end

  create_table "incidents", force: :cascade do |t|
    t.datetime "date_time", null: false
    t.text "location_description"
    t.float "latitude"
    t.float "longitude"
    t.integer "fatality_count", default: 0, null: false
    t.integer "pedestrian_count", default: 0
    t.integer "cyclist_count", default: 0
    t.integer "motorcyclist_count", default: 0
    t.integer "vehicle_occupant_count", default: 0
    t.integer "other_count", default: 0
    t.text "brief_description"
    t.string "information_source", null: false
    t.string "source_url"
    t.integer "verification_status", default: 0
    t.bigint "source_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["date_time"], name: "index_incidents_on_date_time"
    t.index ["latitude", "longitude"], name: "index_incidents_on_latitude_and_longitude"
    t.index ["source_id"], name: "index_incidents_on_source_id"
  end

  create_table "sources", force: :cascade do |t|
    t.string "source_name", null: false
    t.integer "source_reliability", default: 1
    t.datetime "last_updated"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["source_name"], name: "index_sources_on_source_name", unique: true
  end

  add_foreign_key "additional_informations", "incidents"
  add_foreign_key "incidents", "sources"
end
