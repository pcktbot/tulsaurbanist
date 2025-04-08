class CreateSources < ActiveRecord::Migration[7.0]
  def change
    create_table :sources do |t|
      t.string :source_name, null: false
      t.integer :source_reliability, default: 1
      t.datetime :last_updated
      t.timestamps
    end
    
    add_index :sources, :source_name, unique: true
  end
end
