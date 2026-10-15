# frozen_string_literal: true

require 'jekyll'
require 'jekyll-terser'
require 'minitest/autorun'
require 'ostruct'
require 'tmpdir'
require_relative '../_plugins/terser_cache'

class TerserCacheTest < Minitest::Test
  class Compiler
    attr_reader :calls
    def initialize
      @calls = 0
    end
    def compile(source)
      @calls += 1
      "compiled:#{source}"
    end
  end

  def test_static_files_refresh_changed_content_and_fail_closed_on_compilation_errors
    Dir.mktmpdir do |directory|
      File.write(File.join(directory, 'script.js'), 'original')
      site = OpenStruct.new(source: directory, config: {})
      compiler = Compiler.new
      file = Jekyll::Terser::JSFile.new(site, directory, '', 'script.js', compiler)
      destination = File.join(directory, 'output')
      assert file.write(destination)
      refute file.write(destination)
      original_time = File.mtime(File.join(directory, 'script.js'))
      File.write(File.join(directory, 'script.js'), 'changed')
      File.utime(original_time, original_time, File.join(directory, 'script.js'))
      assert file.write(destination)
      assert_equal 'compiled:changed', File.read(File.join(destination, 'script.js'))
      def compiler.compile(*) = raise('compile failed')
      File.write(File.join(directory, 'script.js'), 'invalid')
      assert_raises(Jekyll::Errors::FatalException) { file.write(destination) }
    end
  end

  def test_persistent_cache_and_invalidation
    Dir.mktmpdir do |directory|
      compiler = Compiler.new
      build = ->(options = {}, signature = 'runtime') { TerserCache::Compiler.new(compiler, directory, options, signature: signature) }
      assert_equal 'compiled:source', build.call.compile('source')
      assert_equal 'compiled:source', build.call.compile('source')
      assert_equal 1, compiler.calls
      build.call.compile('changed source')
      build.call({ mangle: false }).compile('source')
      build.call({}, 'new runtime').compile('source')
      assert_equal 4, compiler.calls
    end
  end

  def test_corrupt_entries_regenerate_and_failures_are_not_cached
    Dir.mktmpdir do |directory|
      compiler = Compiler.new
      cache = TerserCache::Compiler.new(compiler, directory, {}, signature: 'runtime')
      cache.compile('source')
      file = Dir[File.join(directory, '*.json')].first
      ['{', '[]', JSON.generate('output' => 'damaged', 'sha256' => 'wrong')].each do |invalid|
        File.write(file, invalid)
        assert_equal 'compiled:source', cache.compile('source')
      end
      assert_equal 4, compiler.calls
      failing = Object.new
      def failing.compile(*) = raise('compile failed')
      cache = TerserCache::Compiler.new(failing, directory, {}, signature: 'failure')
      assert_raises(RuntimeError) { cache.compile('source') }
      assert_equal 1, Dir[File.join(directory, '*.json')].size
    end
  end
end
