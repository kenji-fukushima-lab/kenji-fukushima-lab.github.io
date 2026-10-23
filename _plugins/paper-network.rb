# frozen_string_literal: true

require 'jekyll'
require_relative 'publication-bibliography'
require 'json'
require 'nokogiri'
require 'time'

begin
  require 'bibtex'
rescue LoadError
  BibTeX = nil
end

module PaperNetwork
  class Generator < Jekyll::Generator
    safe true
    priority :low

    def generate(site)
      if BibTeX.nil?
        site.data['paper_network'] = { 'error' => 'bibtex-ruby is not available in the current environment.' }
        return
      end

      bibliography_path = bibliography_path_for(site)
      unless File.file?(bibliography_path)
        site.data['paper_network'] = { 'error' => "Bibliography file not found: #{bibliography_path}" }
        return
      end

      alias_lookup = build_alias_lookup(site.data['coauthor_aliases'])
      focus_name = focus_author_name(site)
      focus_key = normalize_key(focus_name)
      papers = []
      years = []
      links = []
      degree_counts = Hash.new(0)
      weight_sums = Hash.new(0)

      PublicationBibliography.read(site, bibliography_path).each do |entry|
        next unless entry[:author]

        author_names = entry.author.map { |author| canonicalize_name(author.to_s, alias_lookup) }.reject(&:empty?).uniq
        next unless author_names.include?(focus_name)

        year = extract_year(entry)
        years << year if year
        title = strip_markup(entry[:title].to_s)
        abstract = strip_markup(entry[:abstract].to_s)
        key = entry.key.to_s
        doi = strip_markup(entry[:doi].to_s)
        url = publication_url(entry, doi)
        authors_excluding_focus = author_names.reject { |name| normalize_key(name) == focus_key }

        papers << {
          'id' => key,
          'key' => key,
          'title' => title,
          'short_title' => short_title(title),
          'abstract' => abstract.empty? ? nil : abstract,
          'year' => year,
          'authors' => author_names.map { |name| display_name(name) },
          'normalized_authors' => author_names,
          'authors_excluding_focus' => authors_excluding_focus,
          'doi' => doi.empty? ? nil : doi,
          'url' => url
        }
      end

      papers.combination(2) do |left_paper, right_paper|
        shared_authors = left_paper['authors_excluding_focus'] & right_paper['authors_excluding_focus']
        next if shared_authors.empty?

        links << {
          'source' => left_paper['id'],
          'target' => right_paper['id'],
          'weight' => shared_authors.size,
          'shared_authors' => shared_authors.map { |name| display_name(name) },
          'source_year' => left_paper['year'],
          'target_year' => right_paper['year'],
          'year_gap' => year_gap(left_paper['year'], right_paper['year'])
        }

        degree_counts[left_paper['id']] += 1
        degree_counts[right_paper['id']] += 1
        weight_sums[left_paper['id']] += shared_authors.size
        weight_sums[right_paper['id']] += shared_authors.size
      end

      nodes = papers.map do |paper|
        paper.merge(
          'shared_author_degree' => degree_counts[paper['id']],
          'shared_author_weight_sum' => weight_sums[paper['id']],
          'isolated' => degree_counts[paper['id']].zero?
        )
      end.sort_by do |paper|
        [
          -paper['shared_author_weight_sum'],
          -paper['shared_author_degree'],
          -(paper['year'] || 0),
          paper['title']
        ]
      end

      link_list = links.sort_by do |link|
        [
          -link['weight'],
          -(link['source_year'] || 0),
          -(link['target_year'] || 0),
          link['source'],
          link['target']
        ]
      end

      site.data['paper_network'] = {
        'generated_at' => (site.time || Time.now).utc.iso8601,
        'focus_author' => display_name(focus_name),
        'stats' => {
          'paper_count' => nodes.size,
          'connected_paper_count' => nodes.count { |paper| !paper['isolated'] },
          'link_count' => link_list.size,
          'year_first' => years.min,
          'year_last' => years.max,
          'max_edge_weight' => link_list.map { |link| link['weight'] }.max || 0,
          'max_degree' => nodes.map { |paper| paper['shared_author_degree'] }.max || 0,
          'max_weight_sum' => nodes.map { |paper| paper['shared_author_weight_sum'] }.max || 0,
          'excluded_author_for_links' => display_name(focus_name)
        },
        'config' => {
          'link_rule' => 'shared_authors_excluding_focus',
          'min_shared_authors_default' => 1,
          'hide_isolates_default' => false
        },
        'nodes' => nodes,
        'links' => link_list,
        'top_papers' => nodes.first(100)
      }
    rescue StandardError => e
      Jekyll.logger.warn('Paper network:', e.message)
      site.data['paper_network'] = {
        'generated_at' => Time.now.utc.iso8601,
        'error' => e.message
      }
    end

    private

    def bibliography_path_for(site)
      bib_file = site.config.dig('scholar', 'bibliography').to_s
      bib_file = 'papers.bib' if bib_file.empty?
      File.join(site.source, '_bibliography', bib_file)
    end

    def focus_author_name(site)
      last_name = site.config['last_name'].to_s.strip
      first_name = site.config['first_name'].to_s.strip
      if last_name.empty? || first_name.empty?
        last_name = Array(site.config.dig('scholar', 'first_name')).first.to_s.strip
        first_name = Array(site.config.dig('scholar', 'last_name')).first.to_s.strip
      end
      canonicalize_name("#{last_name}, #{first_name}", {})
    end

    def build_alias_lookup(alias_data)
      return {} unless alias_data.is_a?(Hash)

      alias_data.each_with_object({}) do |(canonical_name, aliases), lookup|
        canonical = canonicalize_name(canonical_name.to_s, {})
        next if canonical.empty?

        lookup[normalize_key(canonical)] = canonical
        Array(aliases).each do |alias_name|
          lookup[normalize_key(alias_name.to_s)] = canonical
        end
      end
    end

    def strip_markup(value)
      Nokogiri::HTML::DocumentFragment.parse(value.to_s).text.gsub(/[{}]/, '').strip
    end

    def canonicalize_name(raw_name, alias_lookup)
      cleaned = strip_markup(raw_name.to_s)
      cleaned = cleaned.gsub(/[∗*†‡§¶‖&^]/, '')
      cleaned = cleaned.gsub(/\s+/, ' ').strip
      return '' if cleaned.empty?

      family_name, given_name = if cleaned.include?(',')
                                  cleaned.split(',', 2).map(&:strip)
                                else
                                  parts = cleaned.split(' ')
                                  [parts.pop.to_s, parts.join(' ')]
                                end

      canonical = [normalize_family_name(family_name), normalize_given_name(given_name)].reject(&:empty?).join(', ')
      alias_lookup.fetch(normalize_key(canonical), canonical)
    end

    def display_name(canonical_name)
      family_name, given_name = canonical_name.to_s.split(',', 2).map(&:strip)
      return canonical_name.to_s.strip if family_name.to_s.empty? || given_name.to_s.empty?

      [given_name, family_name].join(' ').strip
    end

    def normalize_family_name(value)
      value.to_s.gsub(/[{}]/, '').gsub(/\s+/, ' ').strip
    end

    def normalize_given_name(value)
      value.to_s.gsub(/[{}]/, '').split.map do |token|
        if token.match?(/\A[A-Z]\z/)
          "#{token}."
        elsif token.match?(/\A[A-Z]\.(?:[A-Z]\.)+\z/)
          token
        elsif token.match?(/\A[A-Z]\.[A-Z]\.?\z/)
          token.chars.each_slice(2).map(&:join).join
        else
          token
        end
      end.join(' ').strip
    end

    def normalize_key(value)
      ascii = value.to_s.unicode_normalize(:nfkd).encode('ASCII', replace: '')
      normalized = ascii.downcase.gsub(/[^a-z0-9\s-]/, ' ').gsub(/\s+/, ' ').strip
      Jekyll::Utils.slugify(normalized, mode: 'pretty')
    end

    def extract_year(entry)
      year_value = entry[:year].to_s[/\d{4}/]
      year_value&.to_i
    end

    def publication_url(entry, doi)
      unless doi.to_s.empty?
        normalized_doi = doi.to_s.strip.sub(%r{\Ahttps?://(?:dx\.)?doi\.org/}i, '')
        return "https://doi.org/#{normalized_doi}"
      end

      url = entry[:url].to_s.strip
      return nil if url.empty?

      url
    end

    def year_gap(left_year, right_year)
      return nil unless left_year && right_year

      (left_year - right_year).abs
    end

    def short_title(title, limit = 54)
      clean = strip_markup(title)
      return clean if clean.length <= limit

      truncated = clean[0, limit]
      truncated = truncated.rpartition(' ').first if truncated.include?(' ')
      truncated = clean[0, limit] if truncated.to_s.strip.empty?
      "#{truncated.strip}..."
    end
  end
end
