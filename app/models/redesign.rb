class Redesign < ApplicationRecord
  belongs_to :user
  has_many :placed_shapes, dependent: :destroy

  validates :name, presence: true
  validates :center_latitude, presence: true
  validates :center_longitude, presence: true
  validates :max_radius, presence: true, numericality: { greater_than: 0 }
end
