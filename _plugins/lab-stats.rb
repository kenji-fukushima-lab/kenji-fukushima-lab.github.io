# frozen_string_literal: true

require 'jekyll'
require 'time'

module LabStats
  class Generator < Jekyll::Generator
    safe true
    priority :low

    def generate(site)
      now = site.time || Time.now
      entries = parse_bib_entries(site)
      years = entries.map { |entry| extract_year(entry) }.compact

      site.data['lab_stats'] = {
        'generated_at' => now.utc.iso8601,
        'publications_total' => entries.size,
        'publications_this_year' => years.count(now.year),
        'active_members' => count_active_members(site),
        'github_repositories' => count_github_repositories(site),
        'rule' => 'all years included',
        'year_first' => years.min,
        'year_latest' => years.max
      }
    rescue StandardError => e
      Jekyll.logger.warn('Lab stats:', e.message)
      site.data['lab_stats'] = {
        'generated_at' => Time.now.utc.iso8601,
        'publications_total' => 0,
        'publications_this_year' => 0,
        'active_members' => 0,
        'github_repositories' => 0,
        'error' => e.message
      }
    end

    private

    def parse_bib_entries(site)
      bib_file = site.config.dig('scholar', 'bibliography').to_s
      bib_file = 'papers.bib' if bib_file.empty?

      path_from_config = File.join(site.source, '_bibliography', bib_file)
      fallback_path = File.join(site.source, '_bibliography', 'papers.bib')
      bib_path = File.file?(path_from_config) ? path_from_config : fallback_path

      return [] unless File.file?(bib_path)

      entries = []
      current_entry = []
      inside_entry = false

      File.foreach(bib_path) do |line|
        if line.match?(/^\s*@\w+\s*\{/)
          if inside_entry && !current_entry.empty?
            entries << current_entry.join
          end
          current_entry = [line]
          inside_entry = true
          next
        end

        next unless inside_entry

        current_entry << line
        if line.strip == '}'
          entries << current_entry.join
          current_entry = []
          inside_entry = false
        end
      end

      entries << current_entry.join if inside_entry && !current_entry.empty?
      entries
    end

    def extract_year(entry)
      match = entry.match(/^\s*year\s*=\s*[{"]?\s*(\d{4})/i)
      return nil unless match

      match[1].to_i
    end

    def count_active_members(site)
      profiles_collection = site.collections['profiles']
      return 0 unless profiles_collection

      profiles_collection.docs.count do |profile|
        relative_path = profile.relative_path.to_s
        basename = File.basename(relative_path, '.*')
        position_key = profile.data['position_key'].to_s.strip
        name = profile.data['name'].to_s.strip

        next false if basename == 'template'
        next false if name.empty?
        next false if position_key == 'future'
        next false if relative_path.include?('/alumni/')
        next false if relative_path.include?('/prospective_members/')

        true
      end
    end

    def count_github_repositories(site)
      repositories = site.data.dig('repositories', 'github_repos')
      return 0 unless repositories.is_a?(Array)

      repositories.size
    end
  end
end
