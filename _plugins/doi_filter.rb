# frozen_string_literal: true

module DoiFilter
  DOI_PREFIX = %r{\Ahttps?://(?:dx\.)?doi\.org/}i

  def normalize_doi(value)
    return "" if value.nil?

    value.to_s.strip.sub(DOI_PREFIX, "")
  end
end

Liquid::Template.register_filter(DoiFilter)
