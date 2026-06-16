class AddSourceTrackingToParkingLots < ActiveRecord::Migration[7.0]
  def change
    change_column_null :parking_lots, :user_id, true
    add_column :parking_lots, :source, :string
    add_column :parking_lots, :external_id, :string
    add_index :parking_lots, [:source, :external_id], unique: true,
              where: "source IS NOT NULL",
              name: "index_parking_lots_on_source_and_external_id"
  end
end
