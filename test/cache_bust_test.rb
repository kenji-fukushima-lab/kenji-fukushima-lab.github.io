# frozen_string_literal: true

require 'jekyll'
require 'minitest/autorun'
require 'tmpdir'
require_relative '../_plugins/cache-bust'

class CacheBustTest < Minitest::Test
  def with_site
    Dir.mktmpdir('cache-bust-test') do |source|
      FileUtils.mkdir_p(File.join(source, 'assets/js'))
      FileUtils.mkdir_p(File.join(source, '_sass/nested'))
      File.write(File.join(source, 'assets/js/site.js'), 'original')
      File.write(File.join(source, '_sass/a.scss'), '.a {}')
      File.write(File.join(source, '_sass/nested/b.scss'), '.b {}')
      yield Struct.new(:source).new(source)
    end
  end

  def render(site, template)
    Liquid::Template.parse(template).render!({}, registers: { site: site })
  end

  def test_reuses_content_digests_across_pages_and_preserves_url_prefixes
    with_site do |site|
      template = "{{ '/assets/js/site.js' | bust_file_cache }} {{ '/base/assets/js/site.js' | bust_file_cache }} " \
                 "{{ '/assets/css/main.css' | bust_css_cache }} {{ '/base/assets/css/main.css' | bust_css_cache }}"
      reads = 0
      trace = TracePoint.new(:c_call) { |event| reads += 1 if event.self == File && event.method_id == :read }
      output = trace.enable do
        3.times.map { render(site, template) }
      end
      file_digest = Digest::MD5.hexdigest('original')
      css_digest = Digest::MD5.hexdigest('.a {}.b {}')
      expected = "/assets/js/site.js?#{file_digest} /base/assets/js/site.js?#{file_digest} " \
                 "/assets/css/main.css?#{css_digest} /base/assets/css/main.css?#{css_digest}"
      assert_equal [expected] * 3, output
      assert_equal 3, reads
    end
  end

  def test_watch_reset_invalidates_asset_and_directory_changes_even_with_preserved_mtime
    with_site do |site|
      template = "{{ '/assets/js/site.js' | bust_file_cache }} {{ '/assets/css/main.css' | bust_css_cache }}"
      before = render(site, template)
      script = File.join(site.source, 'assets/js/site.js')
      mtime = File.mtime(script)
      File.write(script, 'modified')
      File.utime(mtime, mtime, script)
      File.delete(File.join(site.source, '_sass/a.scss'))
      File.write(File.join(site.source, '_sass/new.scss'), '.new {}')
      Jekyll::Hooks.trigger :site, :after_reset, site
      after = render(site, template)
      refute_equal before, after
      assert_includes after, Digest::MD5.hexdigest('modified')
      assert_includes after, Digest::MD5.hexdigest('.b {}.new {}')
      File.delete(script)
      Jekyll::Hooks.trigger :site, :after_reset, site
      assert_raises(Errno::ENOENT) { render(site, template) }
    end
  end

  def test_sites_have_independent_caches
    with_site do |first|
      with_site do |second|
        File.write(File.join(second.source, 'assets/js/site.js'), 'other site')
        template = "{{ '/assets/js/site.js' | bust_file_cache }}"
        assert_includes render(first, template), Digest::MD5.hexdigest('original')
        assert_includes render(second, template), Digest::MD5.hexdigest('other site')
      end
    end
  end
end
