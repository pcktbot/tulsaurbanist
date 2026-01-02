class CreatePlacedShapes < ActiveRecord::Migration[7.0]
  def change
    create_table :placed_shapes do |t|
      t.references :redesign, null: false, foreign_key: true
      t.references :shape_template, null: true, foreign_key: true
      t.string :shape_type, null: false
      t.float :latitude, null: false
      t.float :longitude, null: false
      t.float :rotation, default: 0.0
      t.float :width
      t.float :depth
      t.string :color
      t.jsonb :metadata, default: {}

      t.timestamps
    end

    add_index :placed_shapes, [:latitude, :longitude]
  end
end
