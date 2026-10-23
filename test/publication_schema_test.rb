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
          'first_name' => 'Kenji',
          'last_name' => 'Fukushima',
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
      assert_equal 'https://example.test#kenji-fukushima', article.fetch('author').first.fetch('@id')
      refute article.fetch('author').last.key?('@id')
      assert_equal '2026', article.fetch('datePublished')
      assert_equal 'https://doi.org/10.1000/example', article.fetch('url')
      assert_equal '10.1000/example', article.dig('identifier', 'value')
      assert_equal 'Plant Evolution', article.dig('isPartOf', 'name')
    end
  end

  def test_strip_markup_preserves_plain_text_and_parser_normalization
    generator = PublicationSchema::Generator.new
    cases = {
      nil => '',
      'plain text' => 'plain text',
      'a>b' => 'a>b',
      '<i>pitcher plants</i> &amp; ferns' => 'pitcher plants & ferns',
      '&#65; &madeup;' => 'A &madeup;',
      '\\textit{Nepenthes}' => 'Nepenthes',
      "e\u0301 ı 姓 名" => 'é i 姓 名',
      "a\uFFFEb\uFFFFc" => 'abc'
    }
    (0..31).each do |character|
      text = "a#{character.chr(Encoding::UTF_8)}b"
      cases[text] = [0, 9, 10, 13].include?(character) ? 'a b' : 'ab'
    end
    cases.each do |value, expected|
      assert_equal expected, generator.send(:strip_markup, value), value.inspect
    end
  end
end
