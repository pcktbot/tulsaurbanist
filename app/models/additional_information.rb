class AdditionalInformation < ApplicationRecord
  belongs_to :incident
  
  validates :incident_id, presence: true
  
end
