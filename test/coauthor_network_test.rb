# frozen_string_literal: true

require 'fileutils'
require 'minitest/autorun'
require 'ostruct'
require 'tmpdir'

require_relative '../_plugins/coauthor-network'

class CoauthorNetworkGeneratorTest < Minitest::Test
  def test_repeated_names_and_aliases_keep_node_and_link_metadata
    build_site do |site|
      CoauthorNetwork::Generator.new.generate(site)
      network = site.data.fetch('coauthor_network')
      assert_nil network['error']
      assert_equal 2, network.dig('stats', 'paper_count')
      assert_equal 3, network.dig('stats', 'node_count')
      assert_equal 3, network.dig('stats', 'link_count')
      assert_equal [2, 2, 2], network['links'].map { |link| link['weight'] }
      assert_equal 2, network['nodes'].find { |node| node['id'] == 'doe-jane' }['paper_count']
      assert_equal 1, network['nodes'].find { |node| node['id'] == 'doe-jane' }['highlight_count']
      assert_equal 1, network['nodes'].find { |node| node['id'] == 'muller-anna' }['cofirst_count']
      assert_equal 1, network['nodes'].find { |node| node['is_focus'] }['corresponding_count']
      network['links'].each { |link| assert_equal %w[paper-a paper-b], link['papers'].map { |paper| paper['key'] } }
    end
  end

  def test_reusing_generator_rebuilds_name_mappings_after_alias_changes
    build_site do |site|
      generator = CoauthorNetwork::Generator.new
      generator.generate(site)
      assert_equal 3, site.data.dig('coauthor_network', 'stats', 'node_count')
      site.data['coauthor_aliases'] = {}
      generator.generate(site)
      network = site.data.fetch('coauthor_network')
      assert_nil network['error']
      assert_equal 4, network.dig('stats', 'node_count')
      assert_equal 5, network.dig('stats', 'link_count')
      assert_equal 1, network['nodes'].find { |node| node['id'] == 'doe-jane' }['paper_count']
      assert_equal 1, network['nodes'].find { |node| node['id'] == 'doe-j' }['paper_count']
    end
  end

  private

  def build_site
    Dir.mktmpdir('coauthor-network-test') do |dir|
      FileUtils.mkdir_p(File.join(dir, '_bibliography'))
      File.write(File.join(dir, '_bibliography', 'papers.bib'), <<~BIB)
        @article{paper-a,
          title = {First <em>collaborative</em> paper},
          author = {Fukushima, Kenji and Doe, Jane and Müller, Anna},
          year = {2021}
        }
        @article{paper-b,
          title = {Second collaborative paper},
          author = {Fukushima, Kenji and Doe, J. and Müller, Anna},
          year = {2023},
          highlight = {Doe, J.},
          cofirst_authors = {Müller, Anna},
          corresponding_authors = {Fukushima, Kenji}
        }
        @article{unrelated,
          title = {Unrelated paper},
          author = {Doe, Jane and Müller, Anna},
          year = {2024}
        }
      BIB
      site = OpenStruct.new(
        source: dir,
        config: { 'first_name' => 'Kenji', 'last_name' => 'Fukushima', 'scholar' => { 'bibliography' => 'papers.bib' } },
        data: { 'coauthor_aliases' => { 'Doe, Jane' => ['Doe, J.'] } },
        collections: {},
        time: Time.utc(2026, 10, 23)
      )
      yield site
    end
  end
end
