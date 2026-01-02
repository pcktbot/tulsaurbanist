class CreateRedesigns < ActiveRecord::Migration[7.0]
  def change
    create_table :redesigns do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, null: false
      t.text :description
      t.float :center_latitude, null: false
      t.float :center_longitude, null: false
      t.float :max_radius, null: false, default: 500.0

      t.timestamps
    end

    add_index :redesigns, [:center_latitude, :center_longitude]
  end
end
