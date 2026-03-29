# frozen_string_literal: true

require 'jekyll'
require 'json'
require 'set'
require 'time'
require 'cgi'
require 'net/http'
require 'uri'

begin
  require 'bibtex'
rescue LoadError
  BibTeX = nil
end

module OrganismMap
  class Generator < Jekyll::Generator
    SAFE_SPECIES_STOPWORDS = Set.new(%w[
      adaptation adaptations analysis analyses ancestor ancestors architecture assay assays attack attacks
      capture captures cell cells clade clades colonization comparison comparisons complex complexes condition
      conditions cue cues development diversity digestive digestion dna enzyme enzymes evolution function functions
      gene genes genome genomes gland glands growth habitat habitats hunter hunters innovation innovations interaction
      interactions leaves leaf lineage lineages mechanism mechanisms model models mutant mutants organ organs
      pathway pathways phenotype phenotypes phylogeny plant plants prey protein proteins regulation response responses
      scaffold scaffolds species study syndrome syndromes system systems tissue tissues trait traits variation
    ]).freeze
    NON_GENUS_CANDIDATE_WORDS = Set.new(%w[
      Additional Although American Asian Australia Australian Bayesian Because Bitter Calcium Carnivorous Cell
      Chinese Chromosomal Clonally Comparative Complete Construction Contrasting Convergent Current Darwin Detailed
      Detecting Dominant Emerging Expression Functional Functionally Future Gene Genes Genome Genomic Higher Illumina
      Impaired Interestingly Interlocus Japanese Lake Leaf Markov Molecular Most One Organisms Phylogenetic
      Phylogenomic Pitcher Plant Plants Quality Recent Regarding Salicylic Shaker Somatic Structural Tandem The
      These This Three Traditional Transcriptomic Two Thus Taken Western When While Our Across All Amalgamated
    ]).freeze
    EXCLUDED_TAXON_SUFFIXES = %w[aceae ales inae oideae phyceae phyta mycota viridae virinae].freeze
    WIKIPEDIA_BASE_URL = 'https://en.wikipedia.org/wiki/'.freeze
    NCBI_TAXONOMY_BASE_URL = 'https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?name='.freeze
    GBIF_BASE_URL = 'https://www.gbif.org/species/search?q='.freeze
    GBIF_SEARCH_API_URL = 'https://api.gbif.org/v1/species/search?rank=GENUS&limit=5&q='.freeze
    NCBI_TAXONOMY_ESEARCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=taxonomy&retmode=json&term='.freeze
    GBIF_SPECIES_SEARCH_API_URL = 'https://api.gbif.org/v1/species/search?rank=SPECIES&limit=5&q='.freeze

    safe true
    priority :low

    def generate(site)
      if BibTeX.nil?
        site.data['organism_map'] = { 'error' => 'bibtex-ruby is not available in the current environment.' }
        return
      end

      bibliography_path = bibliography_path_for(site)
      unless File.file?(bibliography_path)
        site.data['organism_map'] = { 'error' => "Bibliography file not found: #{bibliography_path}" }
        return
      end

      focus_name = focus_author_name(site)
      known_catalog = build_taxon_catalog(bibliography_path, focus_name)
      genera = {}
      years = []
      paper_count = 0

      BibTeX.open(bibliography_path).each do |entry|
        next unless focus_author_entry?(entry, focus_name)

        year = extract_year(entry)
        years << year if year
        paper_count += 1

        title = strip_markup(entry[:title].to_s)
        abstract = strip_markup(entry[:abstract].to_s)
        doi = strip_markup(entry[:doi].to_s)
        url = publication_url(entry, doi)
        genus_counts = extract_genus_counts("#{title}\n#{abstract}", known_catalog)
        next if genus_counts.empty?

        genus_counts.each do |genus_name, mention_count|
          genus_key = normalize_key(genus_name)
          genus = genera[genus_key] ||= build_genus_row(genus_name)
          genus['mention_count'] += mention_count
          genus['paper_keys'] << entry.key.to_s
          genus['first_year'] = [genus['first_year'], year].compact.min if year
          genus['last_year'] = [genus['last_year'], year].compact.max if year
          genus['papers'] << {
            'key' => entry.key.to_s,
            'title' => title,
            'year' => year,
            'url' => url,
            'mention_count' => mention_count
          }
        end
      end

      genus_list = genera.values.map do |genus|
        genus['paper_keys'] = genus['paper_keys'].uniq
        genus['paper_count'] = genus['paper_keys'].size
        genus['papers'] = genus['papers'].uniq { |paper| paper['key'] }.sort_by do |paper|
          [-(paper['year'] || 0), paper['title']]
        end
        genus
      end.sort_by do |node|
        [-node['paper_count'], -node['mention_count'], node['label']]
      end

      site.data['organism_map'] = {
        'generated_at' => (site.time || Time.now).utc.iso8601,
        'stats' => {
          'paper_count' => paper_count,
          'genus_count' => genus_list.size,
          'year_first' => years.min,
          'year_last' => years.max,
          'max_mention_count' => genus_list.map { |genus| genus['mention_count'] }.max || 0,
          'max_paper_count' => genus_list.map { |genus| genus['paper_count'] }.max || 0
        },
        'config' => {
          'chart_limit_default' => 25,
          'extraction_rule' => 'conservative_known_genus_matching_from_titles_and_abstracts'
        },
        'genera' => genus_list,
        'top_genera' => genus_list.first(100)
      }
    rescue StandardError => e
      Jekyll.logger.warn('Organism map:', e.message)
      site.data['organism_map'] = {
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
      canonicalize_name("#{last_name}, #{first_name}")
    end

    def focus_author_entry?(entry, focus_name)
      return false unless entry[:author]

      entry.author.map { |author| canonicalize_name(author.to_s) }.uniq.include?(focus_name)
    end

    def build_taxon_catalog(bibliography_path, focus_name)
      genera = Set.new
      species = Set.new

      BibTeX.open(bibliography_path).each do |entry|
        next unless focus_author_entry?(entry, focus_name)

        title_taxa = extract_catalog_taxa(entry[:title].to_s)
        abstract_taxa = extract_validated_abstract_taxa(entry[:abstract].to_s)

        title_taxa.merge(abstract_taxa).each do |taxon_name|
          if species_name?(taxon_name)
            species << taxon_name
            genera << taxon_name.split(' ', 2).first
          else
            genera << taxon_name
          end
        end
      end

      initial_lookup = Hash.new { |hash, key| hash[key] = Set.new }
      species.each do |taxon_name|
        genus_name = taxon_name.split(' ', 2).first
        initial_lookup[genus_name[0]] << genus_name
      end

      {
        'genera' => genera.sort,
        'species' => species,
        'initial_lookup' => initial_lookup
      }
    end

    def extract_catalog_taxa(raw_text)
      taxa = Set.new

      raw_text.to_s.scan(/<i>(.*?)<\/i>/i).flatten.each do |segment|
        cleaned = strip_markup(segment)
        cleaned.scan(/\b([A-Z][a-z]{2,})\s+([a-z][a-z-]{2,})\b/) do |genus_name, species_epithet|
          normalized_epithet = clean_species_epithet(species_epithet)
          next if normalized_epithet.empty?
          next unless accepted_genus_candidate?(genus_name)

          taxa << "#{genus_name} #{normalized_epithet}"
          taxa << genus_name
        end

        next unless cleaned.match?(/\A([A-Z][a-z]{2,})\z/)

        genus_name = Regexp.last_match(1)
        next unless accepted_genus_candidate?(genus_name)

        taxa << genus_name
      end

      taxa
    end

    def extract_validated_abstract_taxa(raw_text)
      taxa = Set.new
      plain_text = strip_markup(raw_text)

      plain_text.scan(/\b([A-Z][a-z]{2,})\s+([a-z][a-z-]{2,})\b/) do |genus_name, species_epithet|
        normalized_epithet = clean_species_epithet(species_epithet)
        next if normalized_epithet.empty?
        next if SAFE_SPECIES_STOPWORDS.include?(normalized_epithet)
        next unless accepted_species_candidate?(genus_name, normalized_epithet)

        taxa << genus_name
        taxa << "#{genus_name} #{normalized_epithet}"
      end

      taxa
    end

    def extract_genus_counts(text, catalog)
      working_text = strip_markup(text.to_s)
      genus_counts = Hash.new(0)

      catalog['genera'].each do |genus_name|
        match_count = working_text.scan(word_pattern(genus_name)).length
        next if match_count.zero?

        genus_counts[genus_name] += match_count
      end

      working_text.scan(/\b([A-Z])\.\s*([a-z][a-z-]{2,})\b/) do |genus_initial, species_epithet|
        normalized_epithet = clean_species_epithet(species_epithet)
        next if normalized_epithet.empty?
        next if SAFE_SPECIES_STOPWORDS.include?(normalized_epithet)

        candidate_genera = catalog['initial_lookup'][genus_initial].to_a
        next unless candidate_genera.size == 1

        genus_counts[candidate_genera.first] += 1
      end

      genus_counts.sort_by { |genus_name, _count| genus_name }.to_h
    end

    def build_genus_row(genus_name)
      {
        'id' => normalize_key(genus_name),
        'label' => genus_name,
        'wikipedia_url' => wikipedia_url_for(genus_name),
        'ncbi_taxonomy_url' => ncbi_taxonomy_url_for(genus_name),
        'gbif_url' => gbif_url_for(genus_name),
        'mention_count' => 0,
        'paper_count' => 0,
        'first_year' => nil,
        'last_year' => nil,
        'paper_keys' => [],
        'papers' => []
      }
    end

    def word_pattern(word)
      /\b#{Regexp.escape(word)}\b/
    end

    def species_name?(taxon_name)
      taxon_name.include?(' ')
    end

    def clean_species_epithet(value)
      value.to_s.downcase.gsub(/\A-+|-+\z/, '')
    end

    def wikipedia_url_for(genus_name)
      "#{WIKIPEDIA_BASE_URL}#{CGI.escape(genus_name.tr(' ', '_'))}"
    end

    def ncbi_taxonomy_url_for(genus_name)
      "#{NCBI_TAXONOMY_BASE_URL}#{CGI.escape(genus_name)}"
    end

    def gbif_url_for(genus_name)
      "#{GBIF_BASE_URL}#{CGI.escape(genus_name)}"
    end

    def validated_genus_name?(genus_name)
      @validated_genus_cache ||= {}
      return @validated_genus_cache[genus_name] if @validated_genus_cache.key?(genus_name)

      @validated_genus_cache[genus_name] = gbif_genus_match?(genus_name) || ncbi_genus_match?(genus_name)
    rescue StandardError => e
      Jekyll.logger.warn('Organism map taxonomy validation:', "#{genus_name}: #{e.message}")
      @validated_genus_cache[genus_name] = false
    end

    def accepted_genus_candidate?(genus_name)
      return false if genus_name.to_s.empty?
      return false if NON_GENUS_CANDIDATE_WORDS.include?(genus_name)
      return false if EXCLUDED_TAXON_SUFFIXES.any? { |suffix| genus_name.end_with?(suffix) }

      validated_genus_name?(genus_name)
    end

    def accepted_species_candidate?(genus_name, species_epithet)
      return false unless accepted_genus_candidate?(genus_name)

      validated_species_name?("#{genus_name} #{species_epithet}")
    end

    def validated_species_name?(species_name)
      @validated_species_cache ||= {}
      return @validated_species_cache[species_name] if @validated_species_cache.key?(species_name)

      @validated_species_cache[species_name] = gbif_species_match?(species_name) || ncbi_species_match?(species_name)
    rescue StandardError => e
      Jekyll.logger.warn('Organism map taxonomy validation:', "#{species_name}: #{e.message}")
      @validated_species_cache[species_name] = false
    end

    def gbif_genus_match?(genus_name)
      response = fetch_json("#{GBIF_SEARCH_API_URL}#{CGI.escape(genus_name)}")
      Array(response['results']).any? do |result|
        result['rank'].to_s.casecmp('GENUS').zero? && result['canonicalName'].to_s == genus_name
      end
    end

    def ncbi_genus_match?(genus_name)
      query = "#{genus_name}[SCIN] AND genus[Rank]"
      response = fetch_json("#{NCBI_TAXONOMY_ESEARCH_URL}#{CGI.escape(query)}")
      response.dig('esearchresult', 'count').to_i.positive?
    end

    def gbif_species_match?(species_name)
      response = fetch_json("#{GBIF_SPECIES_SEARCH_API_URL}#{CGI.escape(species_name)}")
      Array(response['results']).any? do |result|
        result['rank'].to_s.casecmp('SPECIES').zero? && result['canonicalName'].to_s == species_name
      end
    end

    def ncbi_species_match?(species_name)
      query = "#{species_name}[SCIN] AND species[Rank]"
      response = fetch_json("#{NCBI_TAXONOMY_ESEARCH_URL}#{CGI.escape(query)}")
      response.dig('esearchresult', 'count').to_i.positive?
    end

    def fetch_json(url)
      uri = URI.parse(url)
      request = Net::HTTP::Get.new(uri)
      request['User-Agent'] = "Ruby/#{RUBY_VERSION} Jekyll OrganismMap"

      response = Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == 'https', open_timeout: 10, read_timeout: 10) do |http|
        http.request(request)
      end

      raise "HTTP #{response.code} for #{uri.host}" unless response.is_a?(Net::HTTPSuccess)

      JSON.parse(response.body)
    end

    def canonicalize_name(raw_name)
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

      [normalize_family_name(family_name), normalize_given_name(given_name)].reject(&:empty?).join(', ')
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
        elsif token.match?(/\A[A-Z]\.[A-Z]\.??\z/)
          token.chars.each_slice(2).map(&:join).join
        else
          token
        end
      end.join(' ').strip
    end

    def strip_markup(value)
      value.to_s.gsub(/<[^>]+>/, '').gsub(/[{}]/, '').strip
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

    def normalize_key(value)
      ascii = value.to_s.unicode_normalize(:nfkd).encode('ASCII', replace: '')
      normalized = ascii.downcase.gsub(/[^a-z0-9\s-]/, ' ').gsub(/\s+/, ' ').strip
      Jekyll::Utils.slugify(normalized, mode: 'pretty')
    end
  end
end