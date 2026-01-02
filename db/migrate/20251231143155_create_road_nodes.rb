class CreateRoadNodes < ActiveRecord::Migration[7.0]
  def change
    create_table :road_nodes do |t|
      t.references :placed_shape, null: false, foreign_key: true
      t.float :latitude, null: false
      t.float :longitude, null: false
      t.integer :sequence_order, null: false

      t.timestamps
    end

    add_index :road_nodes, [:placed_shape_id, :sequence_order]
  end
end
