class Api::V1::GeocodeController < ApplicationController
  require 'net/http'
  require 'json'

  def search
    query = params[:q].to_s.strip

    if query.blank?
      return render json: { error: 'Query parameter is required' }, status: :bad_request
    end

    query = normalize_intersection(query)

    unless query.match?(/tulsa|oklahoma|ok/i)
      query = "#{query}, Tulsa, OK"
    end

    begin
      token = ENV['MAPBOX_ACCESS_TOKEN']
      encoded_query = URI.encode_www_form_component(query)
      url = "https://api.mapbox.com/geocoding/v5/mapbox.places/#{encoded_query}.json?access_token=#{token}&proximity=-95.9928,36.1540&types=address&limit=5"

      uri = URI(url)
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true
      http.verify_mode = OpenSSL::SSL::VERIFY_NONE if Rails.env.development?

      request = Net::HTTP::Get.new(uri.request_uri)
      response = http.request(request)
      data = JSON.parse(response.body)

      geocoded_results = data['features'].map do |feature|
        {
          latitude: feature['center'][1],
          longitude: feature['center'][0],
          display_name: feature['place_name']
        }
      end

      render json: geocoded_results
    rescue StandardError => e
      Rails.logger.error("Geocoding error: #{e.message}")
      render json: { error: 'Geocoding service unavailable' }, status: :service_unavailable
    end
  end

  private

  def normalize_intersection(query)
    query.gsub(/\s+(?:and|at|@)\s+/i, ' & ')
  end
end
