# frozen_string_literal: true

# Run with the supported Ruby after a production Jekyll build:
# bundle exec ruby tests/benchmarks/cache-bust.rb SITE [PLUGIN]
# One warmup followed by five samples of the actual generated asset references.
require 'jekyll'
require 'digest'
require 'json'

require File.expand_path(ARGV[1] || File.join(__dir__, '../../_plugins/cache-bust.rb'))

site = Struct.new(:source).new(Dir.pwd)
filter = Object.new.extend(Jekyll::CacheBust)
filter.instance_variable_set(:@context, Liquid::Context.new({}, {}, { site: site }))
requests = Dir[File.join(ARGV.fetch(0), '**', '*.html')].sort.flat_map do |file|
  File.read(file).scan(%r{["'](/assets/[^"'?]+)\?[a-f0-9]{32}["']}).flatten
end
raise 'No cache-busted asset references found; supply a fresh Jekyll output before CSS purging' if requests.empty?

samples = 6.times.map do |run|
  Jekyll::Hooks.trigger :site, :after_reset, site
  GC.start
  output = Digest::SHA256.new
  started = Process.clock_gettime(Process::CLOCK_MONOTONIC)
  requests.each do |asset|
    output << if asset == '/assets/css/main.css'
                filter.bust_css_cache(asset)
              else
                filter.bust_file_cache(asset)
              end
  end
  { run: run, seconds: Process.clock_gettime(Process::CLOCK_MONOTONIC) - started, sha256: output.hexdigest }
end
puts JSON.pretty_generate({ pages: Dir[File.join(ARGV[0], '**', '*.html')].size, references: requests.size, samples: samples })
