class AdditionalInformation < ApplicationRecord
  belongs_to :incident
  
  validates :incident_id, presence: true
  
  serialize :vehicle_types, Array
  serialize :contributing_factors, Array
end
