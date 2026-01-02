class CreateShapeTemplates < ActiveRecord::Migration[7.0]
  def change
    create_table :shape_templates do |t|
      t.string :name
      t.string :category
      t.float :width
      t.float :depth
      t.string :color
      t.boolean :is_path, default: false
      t.references :user, null: true, foreign_key: true
      t.jsonb :template_data, default: {}

      t.timestamps
    end
  end
end
