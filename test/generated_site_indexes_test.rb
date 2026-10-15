# frozen_string_literal: true

require 'fileutils'
require 'jekyll'
require 'minitest/autorun'
require 'ostruct'
require 'pathname'
require 'tmpdir'

require_relative '../_plugins/generated_site_indexes'

class GeneratedSiteIndexesTest < Minitest::Test
  def test_cache_reuses_exact_git_answers_and_invalidates_reverted_changes
    Dir.mktmpdir do |dir|
      path = File.join(dir, 'tracked.md')
      File.write(path, 'original')
      File.write(File.join(dir, '.gitignore'), ".jekyll-cache/\n")
      initialize_git_repository(dir)
      commit_all(dir, '2026-01-01T00:00:00Z', 'initial')
      builder = builder_for(dir)
      expected = builder.send(:git_last_modified, path)
      builder.send(:persist_git_lastmod_cache)
      warm = builder_for(dir)
      warm.send(:load_git_lastmod_cache)
      assert_equal expected, warm.instance_variable_get(:@git_lastmod_cache)['tracked.md']
      assert_equal expected, warm.send(:git_last_modified, path)
      File.write(path, 'modified')
      commit_all(dir, '2026-02-01T00:00:00Z', 'modify')
      File.write(path, 'original')
      commit_all(dir, '2026-03-01T00:00:00Z', 'revert contents')
      assert_equal Time.utc(2026, 3, 1), builder_for(dir).send(:git_last_modified, path)
    end
  end

  def test_cache_invalidates_merge_changes_and_renames
    Dir.mktmpdir do |dir|
      path = File.join(dir, 'tracked.md')
      File.write(path, 'original')
      File.write(File.join(dir, '.gitignore'), ".jekyll-cache/\n")
      initialize_git_repository(dir)
      commit_all(dir, '2026-01-01T00:00:00Z', 'initial')
      original = `git -C #{dir} rev-parse --abbrev-ref HEAD`.strip
      builder = builder_for(dir)
      builder.send(:git_last_modified, path)
      builder.send(:persist_git_lastmod_cache)
      run_git(dir, 'checkout', '-qb', 'feature')
      File.write(path, 'branch contents')
      commit_all(dir, '2026-02-01T00:00:00Z', 'branch update')
      run_git(dir, 'checkout', '-q', original)
      run_git(dir, 'merge', '--no-ff', '-qm', 'merge', 'feature')
      expected = Time.parse(`git -C #{dir} log -1 --format=%cI -- tracked.md`.strip)
      assert_equal expected, builder_for(dir).send(:git_last_modified, path)
      run_git(dir, 'mv', 'tracked.md', 'renamed.md')
      commit_all(dir, '2026-04-01T00:00:00Z', 'rename')
      assert_equal Time.utc(2026, 4, 1), builder_for(dir).send(:git_last_modified, File.join(dir, 'renamed.md'))
    end
  end

  def test_page_lastmod_uses_latest_dependency_commit
    Dir.mktmpdir('generated-site-indexes-test') do |dir|
      page_path = File.join(dir, '_pages', 'en-us', 'publications.md')
      bibliography_path = File.join(dir, '_bibliography', 'papers.bib')
      FileUtils.mkdir_p(File.dirname(page_path))
      FileUtils.mkdir_p(File.dirname(bibliography_path))
      File.write(page_path, <<~MARKDOWN)
        ---
        page_id: publications
        permalink: /publications/
        ---
      MARKDOWN
      File.write(bibliography_path, "@article{example, year={2025}}\n")

      initialize_git_repository(dir)
      commit_all(dir, '2026-01-02T03:04:05Z', 'Add publications page')
      File.write(bibliography_path, "@article{example, year={2026}}\n")
      commit_all(dir, '2026-02-03T04:05:06Z', 'Update bibliography')

      entry = builder_for(dir).send(:entry_from_page, Pathname.new(page_path))

      assert_equal 'https://example.test/publications/', entry.fetch(:loc)
      assert_equal Time.utc(2026, 2, 3, 4, 5, 6), entry.fetch(:lastmod)
    end
  end

  def test_page_lastmod_falls_back_to_front_matter_without_git_history
    Dir.mktmpdir('generated-site-indexes-fallback-test') do |dir|
      page_path = File.join(dir, '_pages', 'en-us', 'resources.md')
      FileUtils.mkdir_p(File.dirname(page_path))
      File.write(page_path, <<~MARKDOWN)
        ---
        page_id: resources
        permalink: /resources/
        last_updated: 2026-03-04T05:06:07Z
        ---
      MARKDOWN

      entry = builder_for(dir).send(:entry_from_page, Pathname.new(page_path))

      assert_equal Time.utc(2026, 3, 4, 5, 6, 7), entry.fetch(:lastmod)
    end
  end

  def test_collection_entry_uses_configured_permalink
    Dir.mktmpdir('generated-site-indexes-collection-test') do |dir|
      project_path = File.join(dir, '_projects', 'ja', '1_project.md')
      FileUtils.mkdir_p(File.dirname(project_path))
      File.write(project_path, <<~MARKDOWN)
        ---
        title: 研究興味
        ---
      MARKDOWN

      entry = builder_for(dir).send(:collection_entry, Pathname.new(project_path), 'projects')

      assert_equal 'https://example.test/ja/research/1_project/', entry.fetch(:loc)
    end
  end

  def test_native_publication_dates_and_permalink_drive_all_indexes
    Dir.mktmpdir('native-post-indexes') do |dir|
      posts = File.join(dir, '_posts', 'ja')
      FileUtils.mkdir_p(posts)
      File.write(File.join(posts, '2025-01-01-visible.md'), <<~MD)
        ---
        title: Visible title
        date: 2026-08-31 00:00:00 +0900
        permalink: /custom/visible/
        ---
        Visible summary.
      MD
      File.write(File.join(posts, '2099-01-01-future.md'), "---\ntitle: Future secret\n---\nFuture summary.\n")
      File.write(File.join(posts, '2020-01-01-private.md'), "---\ntitle: Private secret\npublished: false\n---\nPrivate summary.\n")
      configuration = Jekyll.configuration(
        'source' => dir, 'destination' => File.join(dir, '_site'), 'plugins_dir' => [], 'plugins' => [],
        'url' => 'https://example.test', 'baseurl' => '', 'default_lang' => 'en-us', 'languages' => %w[en-us ja],
        'timezone' => 'Asia/Tokyo', 'time' => Time.utc(2026, 8, 30, 15, 0, 1), 'future' => false
      )
      site = Jekyll::Site.new(configuration)
      site.read
      builder = GeneratedSiteIndexes::Builder.new(site)
      assert_equal 1, site.posts.docs.length
      posts_by_language = builder.posts_by_lang_for_liquid
      assert_equal ['/ja/custom/visible/'], posts_by_language.fetch('ja').map { |post| post['url'] }
      assert_empty posts_by_language.fetch('en-us')
      sitemap = builder.send(:build_sitemap_xml)
      assert_includes sitemap, '/ja/custom/visible/'
      assert_includes sitemap, '/ja/blog/2026/'
      refute_includes sitemap, '/2099/'
      refute_includes posts_by_language.to_s, 'secret'

      # A new read after advancing the publication clock must drop the old snapshot.
      site.config['time'] = Time.utc(2099, 1, 2)
      later_site = Jekyll::Site.new(site.config)
      later_site.read
      assert_equal 2, GeneratedSiteIndexes::Builder.new(later_site).posts_by_lang_for_liquid.fetch('ja').length
    end
  end

  private

  def builder_for(dir)
    site = OpenStruct.new(
      source: dir,
      config: {
        'url' => 'https://example.test',
        'baseurl' => '',
        'default_lang' => 'en-us',
        'languages' => %w[en-us ja],
        'collections' => {
          'projects' => { 'permalink' => '/research/:title/' }
        },
        'sitemap_lastmod_dependencies' => {
          'publications' => ['_bibliography/papers.bib']
        }
      }
    )
    GeneratedSiteIndexes::Builder.new(site)
  end

  def initialize_git_repository(dir)
    run_git(dir, 'init', '--quiet')
    run_git(dir, 'config', 'user.name', 'Test User')
    run_git(dir, 'config', 'user.email', 'test@example.test')
  end

  def commit_all(dir, timestamp, message)
    run_git(dir, 'add', '.')
    env = { 'GIT_AUTHOR_DATE' => timestamp, 'GIT_COMMITTER_DATE' => timestamp }
    run_git(dir, 'commit', '--quiet', '-m', message, env: env)
  end

  def run_git(dir, *arguments, env: {})
    success = system(env, 'git', '-C', dir, *arguments, out: File::NULL, err: File::NULL)
    raise "git #{arguments.join(' ')} failed" unless success
  end
end
