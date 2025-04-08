class Source < ApplicationRecord
  has_many :incidents
  
  validates :source_name, presence: true, uniqueness: true
  
  enum source_reliability: {
    low: 0,
    medium: 1,
    high: 2
  }, _default: :medium
end
