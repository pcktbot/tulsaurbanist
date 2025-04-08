class Incident < ApplicationRecord
  has_many :additional_informations, dependent: :destroy
  belongs_to :source, optional: true
  
  validates :date_time, presence: true
  validates :fatality_count, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :pedestrian_count, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :cyclist_count, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :motorcyclist_count, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :vehicle_occupant_count, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :other_count, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
  validates :information_source, presence: true
  
  enum verification_status: {
    unverified: 0,
    partially_verified: 1,
    verified: 2
  }, _default: :unverified
  
  geocoded_by :location_description
  after_validation :geocode, if: ->(obj) { obj.location_description.present? && (obj.latitude.blank? || obj.longitude.blank?) }
  
  def total_fatalities_by_type
    {
      pedestrian: pedestrian_count || 0,
      cyclist: cyclist_count || 0, 
      motorcyclist: motorcyclist_count || 0,
      vehicle_occupant: vehicle_occupant_count || 0,
      other: other_count || 0
    }
  end
  
  def has_geo_coordinates?
    latitude.present? && longitude.present?
  end

end
