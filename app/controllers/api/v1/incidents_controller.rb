class Api::V1::IncidentsController < ApplicationController
  before_action :set_incident, only: [:show_geojson]
  
  def geojson
    incidents = Incident.where.not(latitude: nil, longitude: nil)
    
    render json: {
      type: 'FeatureCollection',
      features: incidents.map { |incident| incident_to_geojson(incident) }
    }
  end

  def show_geojson
    if @incident.has_geo_coordinates?
      render json: incident_to_geojson(@incident)
    else
      render json: { error: 'Incident does not have coordinates' }, status: :unprocessable_entity
    end
  end

  private

  def set_incident
    @incident = Incident.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Incident not found' }, status: :not_found
  end

  def incident_to_geojson(incident)
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [incident.longitude, incident.latitude]
      },
      properties: {
        id: incident.id,
        date_time: incident.date_time.iso8601,
        location_description: incident.location_description,
        brief_description: incident.brief_description,
        fatality_count: incident.fatality_count,
        pedestrian_count: incident.pedestrian_count,
        cyclist_count: incident.cyclist_count,
        motorcyclist_count: incident.motorcyclist_count,
        vehicle_occupant_count: incident.vehicle_occupant_count,
        other_count: incident.other_count,
        information_source: incident.information_source,
        verification_status: incident.verification_status_display,
        fatality_breakdown: incident.total_fatalities_by_type
      }
    }
  end
end
