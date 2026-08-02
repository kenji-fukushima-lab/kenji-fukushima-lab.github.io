# frozen_string_literal: true

require 'jekyll'
require 'nokogiri'

begin
  require 'bibtex'
rescue LoadError
  BibTeX = nil
end

module PublicationSchema
  class Generator < Jekyll::Generator
    safe true
    priority :low

    def generate(site)
      if BibTeX.nil?
        site.data['publication_schema'] = { 'error' => 'bibtex-ruby is not available in the current environment.' }
        return
      end

      bibliography_path = bibliography_path_for(site)
      unless File.file?(bibliography_path)
        site.data['publication_schema'] = { 'error' => "Bibliography file not found: #{bibliography_path}" }
        return
      end

      articles = BibTeX.open(bibliography_path).filter_map do |entry|
        scholarly_article(site, entry.convert(:latex))
      end

      articles.sort_by! do |article|
        [-article.fetch('datePublished', '0').to_i, article.fetch('headline', '')]
      end

      site.data['publication_schema'] = {
        'article_count' => articles.size,
        'articles' => articles
      }
    rescue StandardError => e
      Jekyll.logger.warn('Publication schema:', e.message)
      site.data['publication_schema'] = { 'error' => e.message }
    end

    private

    def bibliography_path_for(site)
      bib_file = site.config.dig('scholar', 'bibliography').to_s
      bib_file = 'papers.bib' if bib_file.empty?
      File.join(site.source, '_bibliography', bib_file)
    end

    def scholarly_article(site, entry)
      title = strip_markup(entry[:title].to_s)
      authors = Array(entry.author).map { |author| author_name(author.to_s) }.reject(&:empty?)
      return nil if title.empty? || authors.empty?

      doi = normalize_doi(entry[:doi].to_s)
      publication_url = publication_url_for(entry, doi)
      article_id = publication_url || "#{site.config.fetch('url', '')}/publications/##{entry.key}"
      journal = strip_markup(entry[:journal].to_s)
      journal = strip_markup(entry[:booktitle].to_s) if journal.empty?

      article = {
        '@type' => 'ScholarlyArticle',
        '@id' => "#{article_id}#scholarly-article",
        'headline' => title,
        'name' => title,
        'author' => authors.map { |name| author_entity(site, name) }
      }

      add_if_present(article, 'datePublished', entry[:year].to_s[/\d{4}/])
      add_if_present(article, 'url', publication_url)
      add_if_present(article, 'volumeNumber', strip_markup(entry[:volume].to_s))
      add_if_present(article, 'issueNumber', strip_markup(entry[:number].to_s))
      add_if_present(article, 'pagination', strip_markup(entry[:pages].to_s))

      unless journal.empty?
        article['isPartOf'] = {
          '@type' => 'Periodical',
          'name' => journal
        }
      end

      unless doi.empty?
        article['identifier'] = {
          '@type' => 'PropertyValue',
          'propertyID' => 'DOI',
          'value' => doi
        }
      end

      article
    end

    def author_entity(site, name)
      entity = { '@type' => 'Person', 'name' => name }
      principal_name = [site.config['first_name'], site.config['middle_name'], site.config['last_name']]
                       .compact
                       .map(&:to_s)
                       .reject(&:empty?)
                       .join(' ')
      site_url = site.config.fetch('url', '').to_s.sub(%r{/+\z}, '')
      entity['@id'] = "#{site_url}#kenji-fukushima" if name == principal_name && !site_url.empty?
      entity
    end

    def add_if_present(hash, key, value)
      hash[key] = value unless value.to_s.empty?
    end

    def publication_url_for(entry, doi)
      return "https://doi.org/#{doi}" unless doi.empty?

      %i[url preprint].each do |field|
        value = strip_markup(entry[field].to_s)
        return value unless value.empty?
      end

      nil
    end

    def normalize_doi(value)
      strip_markup(value).sub(%r{\Ahttps?://(?:dx\.)?doi\.org/}i, '')
    end

    def author_name(value)
      cleaned = strip_markup(value).gsub(/[∗*†‡§¶‖^]/, '').gsub(/\s+/, ' ').strip
      return '' if cleaned.empty?
      return cleaned unless cleaned.include?(',')

      family_name, given_name = cleaned.split(',', 2).map(&:strip)
      [given_name, family_name].reject(&:empty?).join(' ')
    end

    def strip_markup(value)
      Nokogiri::HTML::DocumentFragment.parse(value.to_s).text
             .gsub(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?(?:\{([^{}]*)\})?/) { Regexp.last_match(1).to_s }
             .gsub(/[{}]/, '')
             .gsub(/\s+/, ' ')
             .strip
             .tr("\u0131", 'i')
             .unicode_normalize(:nfc)
    end
  end
end
