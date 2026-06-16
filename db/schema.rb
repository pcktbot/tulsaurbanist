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

ActiveRecord::Schema[7.0].define(version: 2026_06_16_000001) do
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

  create_table "parking_lots", force: :cascade do |t|
    t.jsonb "coordinates", null: false
    t.bigint "user_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "source"
    t.string "external_id"
    t.index ["source", "external_id"], name: "index_parking_lots_on_source_and_external_id", unique: true, where: "(source IS NOT NULL)"
    t.index ["user_id"], name: "index_parking_lots_on_user_id"
  end

  create_table "placed_shapes", force: :cascade do |t|
    t.bigint "redesign_id", null: false
    t.bigint "shape_template_id"
    t.string "shape_type", null: false
    t.float "latitude", null: false
    t.float "longitude", null: false
    t.float "rotation", default: 0.0
    t.float "width"
    t.float "depth"
    t.string "color"
    t.jsonb "metadata", default: {}
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.decimal "height"
    t.index ["latitude", "longitude"], name: "index_placed_shapes_on_latitude_and_longitude"
    t.index ["redesign_id"], name: "index_placed_shapes_on_redesign_id"
    t.index ["shape_template_id"], name: "index_placed_shapes_on_shape_template_id"
  end

  create_table "redesigns", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "name", null: false
    t.text "description"
    t.float "center_latitude", null: false
    t.float "center_longitude", null: false
    t.float "max_radius", default: 500.0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["center_latitude", "center_longitude"], name: "index_redesigns_on_center_latitude_and_center_longitude"
    t.index ["user_id"], name: "index_redesigns_on_user_id"
  end

  create_table "road_nodes", force: :cascade do |t|
    t.bigint "placed_shape_id", null: false
    t.float "latitude", null: false
    t.float "longitude", null: false
    t.integer "sequence_order", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["placed_shape_id", "sequence_order"], name: "index_road_nodes_on_placed_shape_id_and_sequence_order"
    t.index ["placed_shape_id"], name: "index_road_nodes_on_placed_shape_id"
  end

  create_table "shape_templates", force: :cascade do |t|
    t.string "name"
    t.string "category"
    t.float "width"
    t.float "depth"
    t.string "color"
    t.boolean "is_path", default: false
    t.bigint "user_id"
    t.jsonb "template_data", default: {}
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_shape_templates_on_user_id"
  end

  create_table "sources", force: :cascade do |t|
    t.string "source_name", null: false
    t.integer "source_reliability", default: 1
    t.datetime "last_updated"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["source_name"], name: "index_sources_on_source_name", unique: true
  end

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.string "username", default: "", null: false
    t.string "name"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
    t.index ["username"], name: "index_users_on_username", unique: true
  end

  add_foreign_key "additional_informations", "incidents"
  add_foreign_key "incidents", "sources"
  add_foreign_key "parking_lots", "users"
  add_foreign_key "placed_shapes", "redesigns"
  add_foreign_key "placed_shapes", "shape_templates"
  add_foreign_key "redesigns", "users"
  add_foreign_key "road_nodes", "placed_shapes"
  add_foreign_key "shape_templates", "users"
end
