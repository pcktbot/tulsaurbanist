class IncidentsController < ApplicationController
  before_action :set_incident, only: [:show, :edit, :update, :destroy]

  def index
    @incidents = Incident.all.order(date_time: :desc)
  end

  def show
  end

  def new
    @incident = Incident.new
  end

  def create
    @incident = Incident.new(incident_params)

    if @incident.save
      redirect_to @incident, notice: 'Incident was successfully created.'
    else
      render :new
    end
  end

  def edit
  end

  def update
    if @incident.update(incident_params)
      redirect_to @incident, notice: 'Incident was successfully updated.'
    else
      render :edit
    end
  end

  def destroy
    @incident.destroy
    redirect_to incidents_path, notice: 'Incident was successfully deleted.'
  end

  private

  def set_incident
    @incident = Incident.find(params[:id])
  end

  def incident_params
    params.require(:incident).permit(
      :date_time, 
      :location_description, 
      :fatality_count, 
      :pedestrian_count, 
      :cyclist_count, 
      :motorcyclist_count, 
      :vehicle_occupant_count, 
      :other_count, 
      :information_source, 
      :verification_status,
      :latitude,
      :longitude,
      :source_id
    )
  end
end