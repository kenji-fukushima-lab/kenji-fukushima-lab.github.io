# frozen_string_literal: true

require 'fileutils'
require 'jekyll'
require 'minitest/autorun'
require 'ostruct'
require 'pathname'
require 'tmpdir'

require_relative '../_plugins/generated_site_indexes'

class GeneratedSiteIndexesTest < Minitest::Test
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
