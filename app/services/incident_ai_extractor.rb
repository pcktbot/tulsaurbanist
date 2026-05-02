class IncidentAiExtractor
  class ExtractionError < StandardError; end

  MODEL = "claude-haiku-4-5-20251001"

  def self.extract(article_text, publication_date: nil)
    new(article_text, publication_date).extract
  end

  def initialize(article_text, publication_date)
    @article_text = article_text
    @publication_date = publication_date
  end

  def extract
    client = Anthropic::Client.new(api_key: ENV["ANTHROPIC_API_KEY"])
    response = client.messages.create(
      model: MODEL,
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }]
    )
    parse_response(response.content.first.text)
  rescue Anthropic::Errors::APIError => e
    raise ExtractionError, "AI extraction failed: #{e.message}"
  end

  private

  def prompt
    pub_hint = @publication_date ? "The article was published on #{@publication_date.to_date}." : ""
    <<~PROMPT
      Extract structured data from this fatal traffic accident news article in NE Oklahoma/Tulsa area. #{pub_hint}

      <article>
      #{@article_text.truncate(8000)}
      </article>

      Return ONLY a valid JSON object with these fields:
      {
        "date_time": "ISO 8601 datetime of the incident (not publication date), or null if unknown",
        "location_description": "specific street address or intersection from article, or null if not found",
        "fatality_count": total integer deaths,
        "pedestrian_count": integer pedestrians killed (0 if not mentioned),
        "cyclist_count": integer cyclists killed (0 if not mentioned),
        "motorcyclist_count": integer motorcyclists killed (0 if not mentioned),
        "vehicle_occupant_count": integer vehicle occupants killed (0 if not mentioned),
        "other_count": integer other fatalities not fitting above categories (0 if not mentioned),
        "brief_description": "1-2 sentence factual summary of the incident"
      }
    PROMPT
  end

  def parse_response(text)
    json = text.match(/\{.*\}/m)&.to_s
    raise ExtractionError, "No JSON in AI response" unless json
    data = JSON.parse(json)
    {
      date_time: data["date_time"] ? Time.zone.parse(data["date_time"]) : nil,
      location_description: data["location_description"],
      fatality_count: data["fatality_count"].to_i,
      pedestrian_count: data["pedestrian_count"].to_i,
      cyclist_count: data["cyclist_count"].to_i,
      motorcyclist_count: data["motorcyclist_count"].to_i,
      vehicle_occupant_count: data["vehicle_occupant_count"].to_i,
      other_count: data["other_count"].to_i,
      brief_description: data["brief_description"]
    }
  rescue JSON::ParserError => e
    raise ExtractionError, "Could not parse AI response: #{e.message}"
  end
end
