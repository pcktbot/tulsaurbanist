class ShapeTemplate < ApplicationRecord
  belongs_to :user, optional: true

  validates :name, presence: true
  validates :category, presence: true
  validates :width, presence: true, numericality: { greater_than: 0 }
  validates :depth, numericality: { greater_than: 0 }, allow_nil: true
  validates :color, presence: true, format: { with: /\A#[0-9A-Fa-f]{6}\z/ }

  scope :system_templates, -> { where(user_id: nil) }
  scope :user_templates, ->(user) { where(user: user) }
end
