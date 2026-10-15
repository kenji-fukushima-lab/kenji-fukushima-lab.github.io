# frozen_string_literal: true

require 'jekyll'
require 'minitest/autorun'
require 'ostruct'
require 'tmpdir'
require_relative '../_plugins/organism-map'
require_relative '../_plugins/youtube-archive-videos'

class BuildMetadataCacheTest < Minitest::Test
  def test_taxonomy_positive_and_negative_entries_expire_and_legacy_age_is_preserved
    Dir.mktmpdir do |directory|
      cache = File.join(directory, 'organism-map-taxonomy.json')
      site = OpenStruct.new(source: directory, config: { 'cache_dir' => '.' })
      generator = OrganismMap::Generator.new
      File.write(cache, JSON.generate('version' => 1, 'genus' => { 'Known' => true, 'Rejected' => false }))
      generator.send(:initialize_taxonomy_cache, site)
      assert_equal [true, true], generator.send(:cached_taxonomy_value, 'genus', 'Known')
      assert_equal [true, false], generator.send(:cached_taxonomy_value, 'genus', 'Rejected')
      old = Time.now - OrganismMap::Generator::TAXONOMY_CACHE_TTL - 10
      File.utime(old, old, cache)
      generator.send(:initialize_taxonomy_cache, site)
      assert_equal [false, nil], generator.send(:cached_taxonomy_value, 'genus', 'Known')
      generator.send(:store_taxonomy_value, 'genus', 'Known', true)
      generator.send(:store_taxonomy_value, 'species', 'Known species', false)
      generator.send(:write_taxonomy_cache)
      generator.send(:initialize_taxonomy_cache, site)
      assert_equal [true, false], generator.send(:cached_taxonomy_value, 'species', 'Known species')
      generator.instance_variable_get(:@validated_genus_cache)['stale'] = true
      generator.send(:initialize_taxonomy_cache, site)
      assert_empty generator.instance_variable_get(:@validated_genus_cache)
    end
  end

  def test_youtube_fetch_is_shared_between_languages_and_refreshed_on_rebuild
    generator = Outreach::YoutubeArchiveVideosGenerator.new
    calls = 0
    generator.define_singleton_method(:fetch_archive_video_ids) { calls += 1; ['video-id'] }
    site = OpenStruct.new(data: {}, active_lang: 'en-us', default_lang: 'en-us')
    generator.generate(site)
    english = site.data['outreach'].dup
    site.active_lang = 'ja'
    site.data = {}
    generator.generate(site)
    assert_equal english, site.data['outreach']
    assert_equal 1, calls
    site.active_lang = 'en-us'
    generator.generate(site)
    assert_equal 2, calls
  end

  def test_failed_youtube_fetch_uses_one_shared_fallback
    generator = Outreach::YoutubeArchiveVideosGenerator.new
    calls = 0
    generator.define_singleton_method(:fetch_archive_video_ids) { calls += 1; raise 'offline' }
    site = OpenStruct.new(data: {}, active_lang: 'en-us', default_lang: 'en-us')
    generator.generate(site)
    site.active_lang = 'ja'
    site.data = {}
    generator.generate(site)
    assert_equal Outreach::YoutubeArchiveVideosGenerator::FALLBACK_VIDEO_IDS, site.data['outreach']['radio_archive_latest_video_ids']
    assert_equal 1, calls
  end
end
