# frozen_string_literal: true

module ArticleTypeTitleizeFilter
  def article_type_titleize(value)
    return "" if value.nil?

    value.to_s.split(/\s+/).map { |word| word.capitalize }.join(" ")
  end
end

Liquid::Template.register_filter(ArticleTypeTitleizeFilter)
