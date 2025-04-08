class CreateIncidents < ActiveRecord::Migration[7.0]
  def change
    create_table :incidents do |t|
      t.datetime :date_time, null: false
      t.text :location_description
      t.float :latitude
      t.float :longitude
      t.integer :fatality_count, null: false, default: 0
      t.integer :pedestrian_count, default: 0
      t.integer :cyclist_count, default: 0
      t.integer :motorcyclist_count, default: 0
      t.integer :vehicle_occupant_count, default: 0
      t.integer :other_count, default: 0
      t.text :brief_description
      t.string :information_source, null: false
      t.string :source_url
      t.integer :verification_status, default: 0
      t.references :source, foreign_key: true
      t.timestamps
    end
    
    add_index :incidents, :date_time
    add_index :incidents, [:latitude, :longitude]
  end
end
