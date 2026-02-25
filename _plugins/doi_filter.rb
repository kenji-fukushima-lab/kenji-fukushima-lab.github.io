# frozen_string_literal: true

module DoiFilter
  DOI_PREFIX = %r{\Ahttps?://(?:dx\.)?doi\.org/}i
  DOI_LABEL_PREFIX = /\Adoi:\s*/i

  def normalize_doi(value)
    return "" if value.nil?

    value.to_s.strip.sub(DOI_PREFIX, "").sub(DOI_LABEL_PREFIX, "").downcase
  end
end

Liquid::Template.register_filter(DoiFilter)
