class RoadNode < ApplicationRecord
  belongs_to :placed_shape

  validates :latitude, presence: true
  validates :longitude, presence: true
  validates :sequence_order, presence: true
end
