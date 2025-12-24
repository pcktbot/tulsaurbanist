class IncidentsController < ApplicationController
  before_action :authenticate_admin, except: [:index, :show]
  before_action :set_incident, only: [:show, :edit, :update, :destroy]

  def index
    @incidents = Incident.all.order(date_time: :desc)
  end

  def show
  end

  def new
    @incident = Incident.new
  end

  def quick_new
    @incident = Incident.new
  end

  def scrape_new
  end

  def create
    @incident = Incident.new(incident_params)

    if @incident.save
      redirect_to @incident, notice: 'Incident was successfully created.'
    else
      render :new
    end
  end

  def quick_create
    @incident = Incident.new(quick_incident_params)
    @incident.information_source ||= 'Manual Entry'
    @incident.date_time ||= Time.current

    if @incident.save
      redirect_to @incident, notice: 'Incident was successfully created.'
    else
      render :quick_new
    end
  end

  def scrape_create
    url = params[:article_url].to_s.strip
    if url.blank?
      @scrape_error = "Please provide a valid article URL."
      return render :scrape_new
    end

    attributes = IncidentArticleScraper.scrape(url)
    @article_text = attributes.delete(:article_text)
    @incident = Incident.new(attributes)
    @incident.information_source ||= "News Article"

    render :new
  rescue IncidentArticleScraper::ScrapeError => e
    @scrape_error = e.message
    render :scrape_new
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
      :source_id,
      :brief_description
    )
  end

  def quick_incident_params
    params.require(:incident).permit(
      :location_description,
      :fatality_count,
      :brief_description,
      :date_time
    )
  end
end
