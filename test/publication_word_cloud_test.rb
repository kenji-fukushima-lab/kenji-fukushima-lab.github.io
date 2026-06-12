# frozen_string_literal: true

require 'fileutils'
require 'minitest/autorun'
require 'ostruct'
require 'tmpdir'

require_relative '../_plugins/publication-word-cloud'

class PublicationWordCloudGeneratorTest < Minitest::Test
  def setup
    @generator = PublicationWordCloud::Generator.new
  end

  def test_generate_counts_focus_publication_terms
    build_site_with_bibliography(<<~BIB) do |site|
      @article{paper-a,
        title = {Carnivorous plant genome evolution},
        author = {Fukushima, Kenji and Doe, Jane},
        year = {2021},
        abstract = {Carnivorous plants reveal genome evolution in pitcher leaves. This analysis uses two studies.}
      }

      @article{paper-b,
        title = {Plant gene expression in leaves},
        author = {Fukushima, Kenji and Smith, Alex},
        year = {2023},
        abstract = {Gene expression links pitcher leaf development and carnivorous evolution.}
      }

      @article{paper-c,
        title = {Unrelated mammal ecology},
        author = {Roe, John},
        year = {2022},
        abstract = {This paper should not be counted.}
      }
    BIB
      @generator.generate(site)

      data = site.data.fetch('publication_word_cloud')
      words = data.fetch('words').each_with_object({}) { |word, lookup| lookup[word['text']] = word }

      assert_nil data['error']
      assert_equal 2, data.dig('stats', 'paper_count')
      assert_equal 2021, data.dig('stats', 'year_first')
      assert_equal 2023, data.dig('stats', 'year_last')
      assert_equal 3, words.fetch('carnivorous').fetch('count')
      assert_equal 2, words.fetch('carnivorous').fetch('paper_count')
      assert_equal 3, words.fetch('plant').fetch('count')
      refute_includes words.keys, 'analysis'
      refute_includes words.keys, 'study'
      refute_includes words.keys, 'two'
      refute_includes words.keys, 'mammal'
    end
  end

  private

  def build_site_with_bibliography(bibtex)
    Dir.mktmpdir('publication-word-cloud-test') do |dir|
      bibliography_dir = File.join(dir, '_bibliography')
      FileUtils.mkdir_p(bibliography_dir)
      File.write(File.join(bibliography_dir, 'papers.bib'), bibtex)

      site = OpenStruct.new(
        source: dir,
        config: {
          'first_name' => 'Kenji',
          'last_name' => 'Fukushima',
          'scholar' => { 'bibliography' => 'papers.bib' }
        },
        data: {
          'coauthor_aliases' => {}
        },
        time: Time.utc(2026, 6, 12, 0, 0, 0)
      )

      yield site
    end
  end
end
