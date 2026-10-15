# frozen_string_literal: true

# bundle exec ruby tests/benchmarks/terser-cache.rb
require 'jekyll'
require 'jekyll-terser'
require 'benchmark'
require 'digest'
require 'json'
require 'tmpdir'
require_relative '../../_plugins/terser_cache'

configuration = Jekyll.configuration
options = configuration.fetch('terser', {})
paths = Dir['assets/js/*.js'].reject { |path| path.end_with?('.min.js') || File.read(path).start_with?("---\n") }.sort
sources = paths.map { |path| File.read(path) }
compiler = ::Terser.new(options.transform_keys(&:to_sym))
Dir.mktmpdir('terser-benchmark') do |directory|
  cached = TerserCache::Compiler.new(compiler, directory, options)
  reference = sources.map { |source| compiler.compile(source) }
  if ARGV[0]
    paths.zip(reference).each do |path, compiled|
      raise "Built output differs: #{path}" unless File.read(File.join(ARGV[0], path)) == compiled
    end
  end
  assert_equal = ->(output) { raise 'Compiled output differs' unless reference == output }
  assert_equal.call(sources.map { |source| cached.compile(source) })
  results = { sources: sources.size, output_sha256: Digest::SHA256.hexdigest(reference.join("\0")), ruby: RUBY_VERSION, samples: {} }
  { uncached: compiler, cached: cached }.each do |label, target|
    samples = Array.new(5) do
      output = nil
      seconds = Benchmark.realtime { output = sources.map { |source| target.compile(source) } }
      assert_equal.call(output)
      seconds
    end
    results[:samples][label] = { seconds: samples, median: samples.sort[2] }
  end
  puts JSON.pretty_generate(results)
end
