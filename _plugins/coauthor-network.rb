# frozen_string_literal: true

require 'jekyll'
require 'json'
require 'nokogiri'
require 'time'

begin
  require 'bibtex'
rescue LoadError
  BibTeX = nil
end

module CoauthorNetwork
  class Generator < Jekyll::Generator
    safe true
    priority :low

    def generate(site)
      if BibTeX.nil?
        site.data['coauthor_network'] = { 'error' => 'bibtex-ruby is not available in the current environment.' }
        return
      end

      bibliography_path = bibliography_path_for(site)
      unless File.file?(bibliography_path)
        site.data['coauthor_network'] = { 'error' => "Bibliography file not found: #{bibliography_path}" }
        return
      end

      alias_lookup = build_alias_lookup(site.data['coauthor_aliases'])
      profile_lookup = build_profile_lookup(site)
      coauthor_lookup = build_coauthor_lookup(site.data['coauthors'])
      focus_name = focus_author_name(site)
      focus_key = normalize_key(focus_name)

      nodes = {}
      links = {}
      years = []
      papers_count = 0

      BibTeX.open(bibliography_path).each do |entry|
        next unless entry[:author]

        author_names = entry.author.map do |author|
          canonicalize_name(author.to_s, alias_lookup)
        end.compact.uniq
        next unless author_names.include?(focus_name)

        papers_count += 1
        year = extract_year(entry)
        years << year if year
        title = strip_markup(entry[:title].to_s)
        highlight_names = split_name_field(entry[:highlight], alias_lookup)
        corresponding_names = split_name_field(entry[:corresponding_authors], alias_lookup)
        cofirst_names = split_name_field(entry[:cofirst_authors], alias_lookup)

        author_names.each do |name|
          key = normalize_key(name)
          node = nodes[key] ||= build_node(name, key, focus_key, profile_lookup, coauthor_lookup)
          node['paper_count'] += 1
          node['focus_paper_count'] += 1 if key != focus_key
          node['first_year'] = [node['first_year'], year].compact.min if year
          node['last_year'] = [node['last_year'], year].compact.max if year
          node['highlight_count'] += 1 if highlight_names.include?(name)
          node['cofirst_count'] += 1 if cofirst_names.include?(name)
          node['corresponding_count'] += 1 if corresponding_names.include?(name)
          node['paper_keys'] << entry.key.to_s
          node['papers'] << {
            'key' => entry.key.to_s,
            'title' => title,
            'year' => year
          }
        end

        author_names.combination(2) do |left_name, right_name|
          left_key = normalize_key(left_name)
          right_key = normalize_key(right_name)
          edge_key = [left_key, right_key].sort.join('::')
          link = links[edge_key] ||= build_link(left_name, right_name, left_key, right_key, profile_lookup)
          link['weight'] += 1
          link['focus_link'] = true if left_key == focus_key || right_key == focus_key
          link['first_year'] = [link['first_year'], year].compact.min if year
          link['last_year'] = [link['last_year'], year].compact.max if year
          link['papers'] << {
            'key' => entry.key.to_s,
            'title' => title,
            'year' => year
          }
        end
      end

      node_list = nodes.values.map do |node|
        node['paper_keys'] = node['paper_keys'].uniq
        node['papers'] = node['papers'].uniq { |paper| paper['key'] }
        node['focus_paper_count'] = node['paper_count'] if node['is_focus']
        assign_node_role(node, profile_lookup)
        node
      end.sort_by { |node| [-node['paper_count'], node['name']] }

      link_list = links.values.map do |link|
        link['papers'] = link['papers'].uniq { |paper| paper['key'] }
        link
      end.sort_by { |link| [-link['weight'], link['target_name']] }

      role_counts = node_list.each_with_object(Hash.new(0)) { |node, counts| counts[node['role']] += 1 }
      top_collaborators = node_list.sort_by do |node|
        [-node['focus_paper_count'], -node['paper_count'], node['name']]
      end.first(80)

      site.data['coauthor_network'] = {
        'generated_at' => (site.time || Time.now).utc.iso8601,
        'focus_author' => display_name(focus_name),
        'focus_author_key' => focus_key,
        'stats' => {
          'paper_count' => papers_count,
          'node_count' => node_list.size,
          'link_count' => link_list.size,
          'year_first' => years.min,
          'year_last' => years.max,
          'role_counts' => role_counts,
          'top_collaborator_count' => top_collaborators.size
        },
        'nodes' => node_list,
        'links' => link_list,
        'top_collaborators' => top_collaborators
      }
    rescue StandardError => e
      Jekyll.logger.warn('Coauthor network:', e.message)
      site.data['coauthor_network'] = {
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

    def build_profile_lookup(site)
      profiles = site.collections['profiles']
      return {} unless profiles

      profiles.docs.each_with_object({}) do |profile, lookup|
        name = canonicalize_name(profile.data['name'].to_s, {})
        next if name.empty?

        lookup[normalize_key(name)] = {
          'name' => name,
          'position_key' => profile.data['position_key'].to_s,
          'url' => profile_external_url(profile)
        }
      end
    end

    def build_coauthor_lookup(coauthor_data)
      return {} unless coauthor_data.is_a?(Hash)

      coauthor_data.each_with_object({}) do |(last_name_key, entries), lookup|
        Array(entries).each do |entry|
          next unless entry.is_a?(Hash)

          url = entry['url'].to_s.strip
          next if url.empty?

          Array(entry['firstname']).each do |first_name|
            canonical_name = canonicalize_name("#{last_name_key}, #{first_name}", {})
            lookup[normalize_key(canonical_name)] = url unless canonical_name.empty?
          end
        end
      end
    end

    def split_name_field(raw_value, alias_lookup)
      raw = raw_value.to_s.strip
      return [] if raw.empty?

      raw.split(/\band\b/).map { |name| canonicalize_name(name, alias_lookup) }.reject(&:empty?).uniq
    end

    def build_node(name, key, focus_key, profile_lookup, coauthor_lookup)
      profile = profile_lookup[key]
      {
        'id' => key,
        'name' => display_name(name),
        'canonical_name' => name,
        'is_focus' => key == focus_key,
        'paper_count' => 0,
        'focus_paper_count' => 0,
        'first_year' => nil,
        'last_year' => nil,
        'highlight_count' => 0,
        'cofirst_count' => 0,
        'corresponding_count' => 0,
        'position_key' => profile && profile['position_key'],
        'url' => profile&.dig('url') || coauthor_lookup[key],
        'paper_keys' => [],
        'papers' => []
      }
    end

    def assign_node_role(node, _profile_lookup)
      node['role'] = if node['is_focus']
                       'self'
                     elsif node['highlight_count'].positive?
                       'highlighted_collaborator'
                     else
                       'coauthor'
                     end
      node['role_label_ja'] = case node['role']
                              when 'self' then '研究室主宰者'
                              when 'highlighted_collaborator' then '現在・過去の研究室メンバー'
                              else '外部の共同研究者'
                              end
      node['role_label_en'] = case node['role']
                              when 'self' then 'Principal investigator'
                              when 'highlighted_collaborator' then 'Current and former lab members'
                              else 'External collaborators'
                              end
      node
    end

    def build_link(left_name, right_name, left_key, right_key, profile_lookup)
      {
        'source' => left_key,
        'target' => right_key,
        'source_name' => display_name(left_name),
        'target_name' => display_name(right_name),
        'weight' => 0,
        'first_year' => nil,
        'last_year' => nil,
        'focus_link' => false,
        'within_lab' => profile_lookup.key?(left_key) && profile_lookup.key?(right_key),
        'papers' => []
      }
    end

    def extract_year(entry)
      year_value = entry[:year].to_s[/\d{4}/]
      year_value&.to_i
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

    def profile_external_url(profile)
      %w[website researchmap google_scholar orcid github linkedin twitter].each do |field|
        value = profile.data[field].to_s.strip
        return value unless value.empty?
      end
      nil
    end
  end
end
