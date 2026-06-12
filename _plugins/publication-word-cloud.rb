# frozen_string_literal: true

require 'jekyll'
require 'json'
require 'nokogiri'
require 'set'
require 'time'

begin
  require 'bibtex'
rescue LoadError
  BibTeX = nil
end

module PublicationWordCloud
  class Generator < Jekyll::Generator
    safe true
    priority :low

    MAX_TERMS = 80
    MIN_TERM_COUNT = 2

    STOPWORDS = Set.new(%w[
      a about above after again against all also am among an and any are around as at be because been before
      being between both but by can could did do does doing due during each few for from further had has have
      having he her here hers herself him himself his how i if in into is it its itself just may me more most
      my myself no nor not now of off on once only or other our ours ourselves out over own per same she should
      so some such than that the their theirs them themselves then there these they this those through to too
      under until up very was we were what when where which while who whom why will with within without would
      you your yours yourself yourselves
    ])

    ACADEMIC_STOPWORDS = Set.new(%w[
      ability across additional address advance advances allow allows along although approach approaches argue
      associated based best case caused certain changes characterize characterized combined compared demonstrate
      demonstrated demonstrates describe described different discovered during effect effects enabled enable
      environment environmental especially establish evidence example examples exhibit exhibits explain factors
      finding findings first following framework frameworks function functions functional furthermore generate
      generated gives high however identify identified important including indicate indicates insight insights
      investigate investigated known larger likely many mechanism mechanisms method methods model models multiple
      new novel number observed particular possible present presents previous provide provides recently regarding
      related remain remains report reported require required response responses result results reveal revealed
      reveals role roles several show showed showing shows significant specific strongly suggest suggested suggests
      support supports therefore together toward towards uncover underlie underlying unknown using various via well
      wide widespread
      analysis data datasets paper study
      one two three four five six seven eight nine ten first second third
    ])

    TOKEN_ALIASES = {
      'analyses' => 'analysis',
      'cells' => 'cell',
      'changes' => 'change',
      'chromosomes' => 'chromosome',
      'enzymes' => 'enzyme',
      'expressions' => 'expression',
      'genes' => 'gene',
      'genomes' => 'genome',
      'genomic' => 'genome',
      'leaves' => 'leaf',
      'lineages' => 'lineage',
      'mechanisms' => 'mechanism',
      'molecular' => 'molecule',
      'organisms' => 'organism',
      'papers' => 'paper',
      'phenotypes' => 'phenotype',
      'pitchers' => 'pitcher',
      'plants' => 'plant',
      'proteins' => 'protein',
      'sequences' => 'sequence',
      'species' => 'species',
      'studies' => 'study',
      'technologies' => 'technology',
      'traits' => 'trait'
    }.freeze

    def generate(site)
      if BibTeX.nil?
        site.data['publication_word_cloud'] = { 'error' => 'bibtex-ruby is not available in the current environment.' }
        return
      end

      bibliography_path = bibliography_path_for(site)
      unless File.file?(bibliography_path)
        site.data['publication_word_cloud'] = { 'error' => "Bibliography file not found: #{bibliography_path}" }
        return
      end

      alias_lookup = build_alias_lookup(site.data['coauthor_aliases'])
      focus_name = focus_author_name(site)
      term_index = Hash.new do |hash, key|
        hash[key] = {
          'text' => key,
          'count' => 0,
          'paper_keys' => Set.new,
          'title_count' => 0,
          'abstract_count' => 0
        }
      end
      paper_count = 0
      years = []

      BibTeX.open(bibliography_path).each do |entry|
        next unless entry[:author]

        author_names = entry.author.map { |author| canonicalize_name(author.to_s, alias_lookup) }.reject(&:empty?).uniq
        next unless author_names.include?(focus_name)

        key = entry.key.to_s
        paper_count += 1
        year = extract_year(entry)
        years << year if year
        add_terms(term_index, entry[:title].to_s, key, 'title_count')
        add_terms(term_index, entry[:abstract].to_s, key, 'abstract_count')
      end

      terms = term_index.values.select { |term| term['count'] >= MIN_TERM_COUNT }
                        .sort_by { |term| [-term['count'], -term['paper_keys'].size, term['text']] }
                        .first(MAX_TERMS)

      max_count = terms.map { |term| term['count'] }.max || 0
      min_count = terms.map { |term| term['count'] }.min || 0
      terms.each_with_index do |term, index|
        paper_keys = term.delete('paper_keys')
        term['paper_count'] = paper_keys.size
        term['rank'] = index + 1
        term['weight'] = max_count.positive? ? (term['count'].to_f / max_count).round(4) : 0
      end

      site.data['publication_word_cloud'] = {
        'generated_at' => (site.time || Time.now).utc.iso8601,
        'focus_author' => display_name(focus_name),
        'stats' => {
          'paper_count' => paper_count,
          'term_count' => terms.size,
          'year_first' => years.min,
          'year_last' => years.max,
          'max_count' => max_count,
          'min_count' => min_count,
          'source' => 'publication_titles_and_abstracts'
        },
        'words' => terms
      }
    rescue StandardError => e
      Jekyll.logger.warn('Publication word cloud:', e.message)
      site.data['publication_word_cloud'] = {
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

    def add_terms(term_index, raw_text, paper_key, source_counter)
      tokenize(raw_text).each do |term|
        entry = term_index[term]
        entry['count'] += 1
        entry[source_counter] += 1
        entry['paper_keys'] << paper_key
      end
    end

    def tokenize(raw_text)
      strip_markup(raw_text)
        .unicode_normalize(:nfkd)
        .encode('ASCII', replace: ' ')
        .downcase
        .gsub(/[’']/, '')
        .gsub(/[^a-z0-9-]+/, ' ')
        .split
        .map { |token| normalize_term(token) }
        .reject { |token| reject_term?(token) }
    end

    def normalize_term(token)
      cleaned = token.gsub(/\A-+|-+\z/, '').gsub(/-{2,}/, '-')
      return '' if cleaned.empty?

      TOKEN_ALIASES.fetch(cleaned, cleaned)
    end

    def reject_term?(token)
      return true if token.length < 3
      return true if token.match?(/\A\d+\z/)
      return true if token.include?('-') && token.split('-').any? { |part| part.length < 3 }

      STOPWORDS.include?(token) || ACADEMIC_STOPWORDS.include?(token)
    end

    def strip_markup(value)
      Nokogiri::HTML::DocumentFragment.parse(value.to_s).text
             .gsub(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?(?:\{([^{}]*)\})?/) { Regexp.last_match(1).to_s }
             .gsub(/[{}]/, ' ')
             .gsub(/\s+/, ' ')
             .strip
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
  end
end
