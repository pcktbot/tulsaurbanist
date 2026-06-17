class CreateParkingLots < ActiveRecord::Migration[7.0]
  def change
    create_table :parking_lots do |t|
      t.jsonb :coordinates, null: false
      t.references :user, null: false, foreign_key: true
      t.timestamps
    end
  end
end
