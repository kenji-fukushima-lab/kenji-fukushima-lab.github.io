# frozen_string_literal: true

require 'fileutils'
require 'jekyll'
require 'minitest/autorun'
require 'time'
require 'tmpdir'
require_relative '../_plugins/scheduled_posts'
require_relative '../_plugins/generated_site_indexes'

class ScheduledPostsTest < Minitest::Test
  def test_due_and_overdue_posts_join_native_indexes_without_source_mutations
    Dir.mktmpdir('scheduled-posts') do |dir|
      today = post(dir, '2026-08-31-today.md')
      overdue = post(dir, '2026-08-28-overdue.md')
      future = post(dir, '2026-09-01-future.md')
      post(dir, '2026-08-01-private.md', "published: false\n")
      original = File.read(today)
      site = read_at(dir, '2026-08-31T00:00:01+09:00')
      assert_equal %w[overdue today], site.posts.docs.map { |doc| doc.data['slug'] }
      urls = GeneratedSiteIndexes::Builder.new(site).posts_by_lang_for_liquid.fetch('ja').map { |item| item['url'] }
      assert_equal ['/ja/blog/2026/today/', '/ja/blog/2026/overdue/'], urls
      assert_equal original, File.read(today)
      assert File.file?(overdue)
      assert File.file?(future)
      refute File.exist?(File.join(dir, '_posts'))

      # The next read must neither duplicate previously due posts nor keep a
      # stale publication snapshot when another post becomes due.
      site.reset
      site.read
      assert_equal 2, site.posts.docs.length
      assert_equal 3, read_at(dir, '2026-09-01T00:00:01+09:00').posts.docs.length
    end
  end

  def test_native_front_matter_time_and_custom_permalink_are_respected
    Dir.mktmpdir('scheduled-post-time') do |dir|
      post(dir, '2026-08-01-timed.md', "date: 2026-08-31 09:00:00 +0900\npermalink: /custom/timed/\n")
      assert_empty read_at(dir, '2026-08-31T08:59:59+09:00').posts.docs
      site = read_at(dir, '2026-08-31T09:00:01+09:00')
      assert_equal ['/ja/custom/timed/'], GeneratedSiteIndexes::Builder.new(site).posts_by_lang_for_liquid.fetch('ja').map { |item| item['url'] }
      document = site.posts.docs.first
      document.output = Jekyll::Renderer.new(site, document).run
      document.write(site.dest)
      assert_includes File.read(document.destination(site.dest)), 'Scheduled body'
    end
  end

  def test_existing_posts_are_never_overwritten
    Dir.mktmpdir('scheduled-post-conflict') do |dir|
      source = post(dir, '2026-08-01-existing.md')
      target = File.join(dir, '_posts/ja', File.basename(source))
      FileUtils.mkdir_p(File.dirname(target))
      File.write(target, "---\ntitle: Existing\n---\nExisting body\n")
      error = assert_raises(Jekyll::Errors::FatalException) { read_at(dir, '2026-08-31T12:00:00+09:00') }
      assert_includes error.message, 'conflicts with an existing post'
      assert_includes File.read(target), 'Existing body'
      assert File.file?(source)
    end
  end

  private

  def post(dir, filename, front_matter = '')
    path = File.join(dir, '_scheduled/ja', filename)
    FileUtils.mkdir_p(File.dirname(path))
    File.write(path, "---\ntitle: Scheduled\n#{front_matter}---\nScheduled body\n")
    path
  end

  def read_at(dir, time)
    site = Jekyll::Site.new(Jekyll.configuration(
      'source' => dir, 'destination' => File.join(dir, '_site'), 'plugins_dir' => [], 'plugins' => [],
      'default_lang' => 'en-us', 'languages' => %w[en-us ja], 'url' => 'https://example.test',
      'permalink' => '/blog/:year/:title/', 'timezone' => 'Asia/Tokyo', 'time' => Time.iso8601(time), 'future' => false
    ))
    site.read
    site
  end
end
