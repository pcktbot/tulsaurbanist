class CreateAdditionalInformations < ActiveRecord::Migration[7.0]
  def change
    create_table :additional_informations do |t|
      t.references :incident, null: false, foreign_key: true
      t.string :vehicle_types, array: true, default: []
      t.string :contributing_factors, array: true, default: []
      t.string :road_conditions
      t.text :notes
      t.timestamps
    end
  end
end
