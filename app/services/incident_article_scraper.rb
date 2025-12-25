require "open-uri"
require "nokogiri"

class IncidentArticleScraper
  class ScrapeError < StandardError; end

  WORD_NUMBER_MAP = {
    "one" => 1,
    "two" => 2,
    "three" => 3,
    "four" => 4,
    "five" => 5,
    "six" => 6,
    "seven" => 7,
    "eight" => 8,
    "nine" => 9,
    "ten" => 10
  }.freeze

  def self.scrape(url)
    new(url).scrape
  end

  def initialize(url)
    @url = url
  end

  def scrape
    doc = Nokogiri::HTML(fetch_html)
    metadata = extract_metadata(doc)
    article_text = extract_article_text(doc)

    {
      date_time: parse_time(metadata[:date]) || Time.current,
      location_description: extract_location(article_text),
      fatality_count: extract_fatalities(article_text),
      brief_description: metadata[:description] || extract_summary(article_text),
      information_source: @url,
      article_text: article_text
    }
  rescue OpenURI::HTTPError, SocketError, URI::InvalidURIError => e
    raise ScrapeError, "Unable to fetch article: #{e.message}"
  end

  private

  def fetch_html
    URI.open(@url, "User-Agent" => "TulsaUrbanist Incident Scraper").read
  end

  def extract_metadata(doc)
    json_ld = extract_json_ld(doc)
    {
      title: json_ld[:headline] || meta_content(doc, "property", "og:title"),
      description: json_ld[:description] || meta_content(doc, "name", "description") || meta_content(doc, "property", "og:description"),
      date: json_ld[:date_published] || meta_content(doc, "property", "article:published_time"),
      source: json_ld[:publisher] || meta_content(doc, "property", "og:site_name")
    }
  end

  def extract_json_ld(doc)
    scripts = doc.css('script[type="application/ld+json"]').map(&:text)
    data = scripts.flat_map do |script|
      parsed = JSON.parse(script)
      parsed.is_a?(Array) ? parsed : [parsed]
    rescue JSON::ParserError
      []
    end

    article = data.find do |item|
      type = item["@type"]
      type == "NewsArticle" || type == "Article" || Array(type).include?("NewsArticle")
    end

    return {} unless article

    {
      headline: article["headline"],
      description: article["description"],
      date_published: article["datePublished"],
      publisher: article.dig("publisher", "name")
    }
  end

  def extract_article_text(doc)
    selectors = [
      "[itemprop='articleBody']",
      "article",
      "main",
      "[role='main']"
    ]

    selectors.each do |selector|
      node = doc.at(selector)
      next unless node

      scrub_article_node(node)
      text = node.text.squish
      return text if text.present?
    end

    doc.css("p").map { |p| p.text.squish }.join(" ")
  end

  def extract_fatalities(text)
    return 0 if text.blank?

    numeric_match = text.match(/\b(\d+)\b[^.]{0,80}\b(killed|dead|dies|died)\b/i)
    return numeric_match[1].to_i if numeric_match

    word_match = text.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b[^.]{0,80}\b(killed|dead|dies|died)\b/i)
    return WORD_NUMBER_MAP[word_match[1].downcase] if word_match

    0
  end

  def extract_location(text)
    return nil if text.blank?

    sentence = text.split(/[.!?]/).find { |line| line.match?(/\b(at|near|on|along|in)\b/i) }
    return nil unless sentence

    sentence.strip
  end

  def extract_summary(text)
    return nil if text.blank?

    text.strip[0, 300]
  end

  def scrub_article_node(node)
    node.css("script, style, nav, footer, header, aside, form, noscript").remove
    node.css("*").each do |child|
      class_list = child["class"].to_s
      id_value = child["id"].to_s
      combined = "#{class_list} #{id_value}".downcase

      if combined.match?(/advert|promo|related|social|share|newsletter|subscribe|live|video|player/)
        child.remove
      end
    end
  end

  def parse_time(value)
    return nil if value.blank?

    Time.zone.parse(value.to_s)
  rescue ArgumentError
    nil
  end

  def meta_content(doc, attr_key, attr_value)
    doc.at("meta[#{attr_key}='#{attr_value}']")&.[]("content")
  end

  def source_from_url
    URI.parse(@url).host
  rescue URI::InvalidURIError
    nil
  end
end
