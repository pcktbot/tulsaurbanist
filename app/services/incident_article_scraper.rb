require "open-uri"
require "nokogiri"

class IncidentArticleScraper
  class ScrapeError < StandardError; end

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
      article_text: article_text,
      publication_date: parse_time(metadata[:date]),
      information_source: @url
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
      date: json_ld[:date_published] || meta_content(doc, "property", "article:published_time")
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

    { date_published: article["datePublished"] }
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
end
