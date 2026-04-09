# frozen_string_literal: true

require 'fileutils'
require 'minitest/autorun'
require 'ostruct'
require 'tmpdir'

require_relative '../_plugins/paper-network'

class PaperNetworkGeneratorTest < Minitest::Test
  def setup
    @generator = PaperNetwork::Generator.new
  end

  def test_plugin_source_contains_no_nul_bytes
    source = File.binread(File.expand_path('../_plugins/paper-network.rb', __dir__))

    refute_includes source, "\x00"
  end

  def test_normalize_given_name_keeps_compact_initials_readable
    assert_equal 'A.B', @generator.send(:normalize_given_name, 'A.B')
    assert_equal 'A.B.', @generator.send(:normalize_given_name, 'A.B.')
    assert_equal 'A. B.', @generator.send(:normalize_given_name, 'A B')
  end

  def test_generate_builds_expected_network_data
    build_site_with_bibliography(<<~BIB) do |site|
      @article{paper-a,
        title = {First collaborative paper},
        author = {Fukushima, Kenji and Doe, Jane and Roe, John},
        year = {2021},
        doi = {10.1000/example-a}
      }

      @article{paper-b,
        title = {Second collaborative paper},
        author = {Fukushima, Kenji and Doe, J. and Smith, Alex},
        year = {2023},
        url = {https://example.com/paper-b}
      }

      @article{paper-c,
        title = {Isolated paper},
        author = {Fukushima, Kenji and Wang, Li},
        year = {2022}
      }
    BIB
      @generator.generate(site)

      data = site.data.fetch('paper_network')
      stats = data.fetch('stats')
      paper_a = data.fetch('nodes').find { |node| node['id'] == 'paper-a' }
      paper_b = data.fetch('nodes').find { |node| node['id'] == 'paper-b' }
      paper_c = data.fetch('nodes').find { |node| node['id'] == 'paper-c' }
      link = data.fetch('links').first

      assert_nil data['error']
      assert_equal false, data.dig('config', 'hide_isolates_default')
      assert_equal 3, stats['paper_count']
      assert_equal 2, stats['connected_paper_count']
      assert_equal 1, stats['link_count']
      assert_equal 2021, stats['year_first']
      assert_equal 2023, stats['year_last']
      assert_equal 'Jane Doe', link['shared_authors'].first
      assert_equal %w[paper-a paper-b], [link['source'], link['target']].sort
      assert_equal 'https://doi.org/10.1000/example-a', paper_a['url']
      assert_equal 'https://example.com/paper-b', paper_b['url']
      assert_equal true, paper_c['isolated']
    end
  end

  private

  def build_site_with_bibliography(bibtex)
    Dir.mktmpdir('paper-network-test') do |dir|
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
          'coauthor_aliases' => {
            'Doe, Jane' => ['Doe, J.']
          }
        },
        time: Time.utc(2026, 4, 9, 0, 0, 0)
      )

      yield site
    end
  end
end
