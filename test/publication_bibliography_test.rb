# frozen_string_literal: true
require 'minitest/autorun'
require 'bibtex'
require 'ostruct'
require 'tmpdir'
require_relative '../_plugins/publication-bibliography'
class PublicationBibliographyTest < Minitest::Test
  def setup
    @dir = Dir.mktmpdir
    @path = File.join(@dir, 'papers.bib')
    @site = Object.new
    @source = "@article{one, title = {Alpha}, author = {Fukushima, Kenji and Echevarr{\\'\\i}a-Poza, Alberto}, year = {2026}}"
    File.write(@path, @source)
  end
  def teardown
    FileUtils.remove_entry(@dir)
  end
  def test_parse_reuse_and_independent_entries
    parse = BibTeX::Bibliography.method(:parse)
    calls = 0
    BibTeX::Bibliography.define_singleton_method(:parse) { |source| calls += 1; parse.call(source) }
    begin
      first = PublicationBibliography.read(@site, @path)
      second = PublicationBibliography.read(@site, @path)
      assert_equal 1, calls
      first['one'][:title] = 'Mutated'
      first['one'].convert!(:latex)
      assert_equal 'Alpha', second['one'][:title].to_s
      assert_equal @source, File.read(@path)
      assert_includes second['one'][:author].to_s, '\\'
      assert_equal 'Alpha', PublicationBibliography.read(@site, @path)['one'][:title].to_s
    ensure
      BibTeX::Bibliography.define_singleton_method(:parse, parse)
    end
  end
  def test_same_size_and_mtime_content_edit_is_not_stale
    first = PublicationBibliography.read(@site, @path)
    stamp = File.mtime(@path)
    File.write(@path, @source.sub('Alpha', 'Omega'))
    File.utime(stamp, stamp, @path)
    assert_equal @source.bytesize, File.size(@path)
    assert_equal stamp, File.mtime(@path)
    assert_equal 'Omega', PublicationBibliography.read(@site, @path)['one'][:title].to_s
    assert_equal 'Alpha', first['one'][:title].to_s
  end
  def test_different_paths_and_sites_do_not_share_mutable_entries
    other_path = File.join(@dir, 'other.bib')
    File.write(other_path, @source.sub('Alpha', 'Bravo'))
    assert_equal 'Alpha', PublicationBibliography.read(@site, @path)['one'][:title].to_s
    assert_equal 'Bravo', PublicationBibliography.read(@site, other_path)['one'][:title].to_s
    assert_equal 'Alpha', PublicationBibliography.read(@site, @path)['one'][:title].to_s
    other_site = Object.new
    first = PublicationBibliography.read(@site, @path)
    other = PublicationBibliography.read(other_site, @path)
    first['one'][:title] = 'Changed'
    assert_equal 'Alpha', other['one'][:title].to_s
  end
  def test_reset_discards_build_cache
    PublicationBibliography.read(@site, @path)
    Jekyll::Hooks.trigger(:site, :after_reset, @site)
    refute @site.instance_variable_defined?(:@publication_bibliography)
    assert_equal 'Alpha', PublicationBibliography.read(@site, @path)['one'][:title].to_s
    Jekyll::Hooks.trigger(:site, :after_reset, Object.new)
  end
  def test_failed_read_does_not_return_cached_contents
    PublicationBibliography.read(@site, @path)
    File.unlink(@path)
    assert_raises(Errno::ENOENT) { PublicationBibliography.read(@site, @path) }
    File.write(@path, @source.sub('Alpha', 'Delta'))
    assert_equal 'Delta', PublicationBibliography.read(@site, @path)['one'][:title].to_s
  end
end
