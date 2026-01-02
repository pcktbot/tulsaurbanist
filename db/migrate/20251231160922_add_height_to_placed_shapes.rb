class AddHeightToPlacedShapes < ActiveRecord::Migration[7.0]
  def change
    add_column :placed_shapes, :height, :decimal
  end
end
