# frozen_string_literal: true

require 'minitest/autorun'
require 'ostruct'
require 'tmpdir'
require_relative '../_plugins/organism-map'

class OrganismMapGeneratorTest < Minitest::Test
  class OfflineGenerator < OrganismMap::Generator
    private

    def validated_genus_name?(name)
      %w[Nepenthes Drosera].include?(name)
    end

    def validated_species_name?(name)
      ['Nepenthes gracilis', 'Drosera rotundifolia'].include?(name)
    end

    def fetch_json(url)
      raise "Unexpected network request: #{url}"
    end
  end

  BIBLIOGRAPHY = <<~BIB
    @article{earlier,
      title = {Nepenthes and N. gracilis},
      author = {Fukushima, Kenji and Doe, Jane},
      year = {2021},
      abstract = {Nepenthes and N. gracilis},
      doi = {https://doi.org/10.1000/earlier}
    }
    @article{later,
      title = {<i>Nepenthes gracilis</i>},
      author = {Fukushima, Kenji},
      year = {2023},
      url = {https://example.test/later}
    }
    @article{unrelated,
      title = {<i>Drosera rotundifolia</i>},
      author = {Other, Author},
      year = {2000}
    }
    @article{anonymous,
      title = {<i>Drosera rotundifolia</i>},
      year = {1999}
    }
  BIB

  def test_catalog_from_later_papers_applies_to_earlier_papers
    with_site(BIBLIOGRAPHY) do |site, _path|
      OfflineGenerator.new.generate(site)

      data = site.data.fetch('organism_map')
      assert_nil data['error']
      assert_equal 2, data.dig('stats', 'paper_count')
      assert_equal 1, data.dig('stats', 'genus_count')
      assert_equal 2021, data.dig('stats', 'year_first')
      assert_equal 2023, data.dig('stats', 'year_last')
      genus = data.fetch('genera').fetch(0)
      assert_equal 'Nepenthes', genus['label']
      assert_equal 5, genus['mention_count']
      assert_equal 2, genus['paper_count']
      assert_equal %w[later earlier], genus['papers'].map { |paper| paper['key'] }
      assert_equal 'https://doi.org/10.1000/earlier', genus['papers'].last['url']
      assert_equal 'https://example.test/later', genus['papers'].first['url']
    end
  end

  def test_same_generator_rereads_changed_bibliography_on_a_later_generate
    with_site(BIBLIOGRAPHY) do |site, path|
      generator = OfflineGenerator.new
      generator.generate(site)
      assert_equal 'Nepenthes', site.data.fetch('organism_map').fetch('genera').first['label']
      File.write(path, <<~BIB)
        @article{replacement,
          title = {<i>Drosera rotundifolia</i>},
          author = {Fukushima, Kenji},
          year = {2024}
        }
      BIB
      generator.generate(site)
      data = site.data.fetch('organism_map')
      assert_nil data['error']
      assert_equal 1, data.dig('stats', 'paper_count')
      assert_equal ['Drosera'], data.fetch('genera').map { |genus| genus['label'] }
      assert_equal ['replacement'], data.fetch('genera').first['paper_keys']
    end
  end

  private

  def with_site(bibliography)
    Dir.mktmpdir('organism-map-test') do |source|
      FileUtils.mkdir_p(File.join(source, '_bibliography'))
      path = File.join(source, '_bibliography', 'papers.bib')
      File.write(path, bibliography)
      site = OpenStruct.new(source: source, data: {}, time: Time.utc(2026, 10, 23), config: {
        'first_name' => 'Kenji', 'last_name' => 'Fukushima', 'scholar' => { 'bibliography' => 'papers.bib' }
      })
      yield site, path
    end
  end
end
