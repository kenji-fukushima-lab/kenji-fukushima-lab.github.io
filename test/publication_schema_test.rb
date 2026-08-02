# frozen_string_literal: true

require 'fileutils'
require 'minitest/autorun'
require 'ostruct'
require 'tmpdir'

require_relative '../_plugins/publication-schema'

class PublicationSchemaGeneratorTest < Minitest::Test
  def test_generate_builds_scholarly_article_data
    Dir.mktmpdir('publication-schema-test') do |dir|
      bibliography_dir = File.join(dir, '_bibliography')
      FileUtils.mkdir_p(bibliography_dir)
      File.write(File.join(bibliography_dir, 'papers.bib'), <<~BIB)
        @article{pitcher-plant,
          title = {Evolution of <i>pitcher plants</i>},
          author = {Fukushima, Kenji and Echevarr{\\'\\i}a-Poza, Alberto},
          year = {2026},
          journal = {Plant Evolution},
          volume = {12},
          number = {3},
          pages = {101--112},
          doi = {https://doi.org/10.1000/example}
        }
      BIB

      site = OpenStruct.new(
        source: dir,
        config: {
          'url' => 'https://example.test',
          'scholar' => { 'bibliography' => 'papers.bib' }
        },
        data: {}
      )

      PublicationSchema::Generator.new.generate(site)
      schema = site.data.fetch('publication_schema')
      article = schema.fetch('articles').first

      assert_equal 1, schema.fetch('article_count')
      assert_equal 'ScholarlyArticle', article.fetch('@type')
      assert_equal 'Evolution of pitcher plants', article.fetch('headline')
      assert_equal ['Kenji Fukushima', 'Alberto Echevarría-Poza'], article.fetch('author').map { |author| author.fetch('name') }
      assert_equal '2026', article.fetch('datePublished')
      assert_equal 'https://doi.org/10.1000/example', article.fetch('url')
      assert_equal '10.1000/example', article.dig('identifier', 'value')
      assert_equal 'Plant Evolution', article.dig('isPartOf', 'name')
    end
  end
end
