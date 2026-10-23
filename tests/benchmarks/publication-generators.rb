# frozen_string_literal: true

# ruby tests/benchmarks/publication-generators.rb REFERENCE_SHA [TAXONOMY_CACHE]
# Uses real bibliography/profile inputs and an offline taxonomy snapshot. All
# five generator outputs must match, including when consumers run in reverse.
require 'jekyll'
require 'json'
require 'yaml'
require 'date'
require 'ostruct'
require 'open3'
require 'digest'
require 'tmpdir'
require 'fileutils'

root = File.expand_path('../..', __dir__)
reference = ARGV.fetch(0)
taxonomy_path = ARGV[1] || File.join(root, '.jekyll-cache/organism-map-taxonomy.json')
taxonomy = JSON.parse(File.read(taxonomy_path))
plugins = {
  'coauthor-network' => 'CoauthorNetwork',
  'paper-network' => 'PaperNetwork',
  'organism-map' => 'OrganismMap',
  'publication-word-cloud' => 'PublicationWordCloud',
  'publication-schema' => 'PublicationSchema'
}
classes = { 'reference' => [], 'current' => [] }
plugins.each do |file, namespace|
  source, status = Open3.capture2e('git', '-C', root, 'show', "#{reference}:_plugins/#{file}.rb")
  abort source unless status.success?
  Object.class_eval(source.sub("module #{namespace}", "module Reference#{namespace}"), File.join(root, '_plugins', "#{file}.rb"))
  require File.join(root, '_plugins', file)
  classes['reference'] << Object.const_get("Reference#{namespace}")::Generator
  classes['current'] << Object.const_get(namespace)::Generator
end

# Use the same saved positive/negative decisions even after their production
# TTL expires. Missing decisions fail the benchmark instead of contacting APIs.
[ReferenceOrganismMap::Generator, OrganismMap::Generator].each do |klass|
  { validated_genus_name?: 'genus', validated_species_name?: 'species' }.each do |method, kind|
    klass.send(:define_method, method) do |name|
      record = taxonomy.fetch(kind).fetch(name)
      record.is_a?(Hash) ? record.fetch('value') : record
    end
  end
  klass.send(:define_method, :fetch_json) { |url| raise "Unexpected network request: #{url}" }
end

config = YAML.safe_load_file(File.join(root, '_config.yml'), permitted_classes: [Date, Time], aliases: true)
data = %w[coauthor_aliases coauthors].to_h do |name|
  [name, YAML.safe_load_file(File.join(root, '_data', "#{name}.yml"), aliases: true)]
end
profiles = Dir[File.join(root, '_profiles/**/*.md')].filter_map do |path|
  front_matter = File.read(path)[/\A---\s*\n(.*?)\n---/m, 1]
  OpenStruct.new(data: YAML.safe_load(front_matter, permitted_classes: [Date, Time], aliases: true) || {}) if front_matter
end
keys = plugins.keys.map { |file| file.tr('-', '_') }
warmups = Integer(ENV.fetch('WARMUPS', '3'))
runs = Integer(ENV.fetch('RUNS', '11'))
abort 'RUNS must be positive and WARMUPS nonnegative' unless runs.positive? && warmups >= 0
samples = { 'reference' => [], 'current' => [] }
expected = nil
$stdout.sync = true

Dir.mktmpdir('publication-generators-') do |cache|
  FileUtils.cp(taxonomy_path, File.join(cache, 'organism-map-taxonomy.json'))
  make_site = lambda do
    OpenStruct.new(source: root, config: config.merge('cache_dir' => cache), data: data.dup,
                   time: Time.utc(2026, 10, 23), collections: { 'profiles' => OpenStruct.new(docs: profiles) })
  end
  (warmups + runs).times do |run|
    order = run.even? ? classes.to_a : classes.to_a.reverse
    order.each do |variant, generators|
      GC.start
      reader, writer = IO.pipe
      # Each replay starts with the same library/heap state. Reusing a process
      # made BibTeX/LaTeX allocations grow across samples in the reference too.
      pid = fork do
        reader.close
        begin
          site = make_site.call
          allocations = GC.stat(:total_allocated_objects)
          wall = Process.clock_gettime(Process::CLOCK_MONOTONIC)
          cpu = Process.clock_gettime(Process::CLOCK_PROCESS_CPUTIME_ID)
          generators.each { |klass| klass.new.generate(site) }
          elapsed_cpu = Process.clock_gettime(Process::CLOCK_PROCESS_CPUTIME_ID) - cpu
          elapsed_wall = Process.clock_gettime(Process::CLOCK_MONOTONIC) - wall
          allocated = GC.stat(:total_allocated_objects) - allocations
          output = keys.to_h { |key| [key, site.data.fetch(key)] }
          output.each { |key, value| raise "#{key}: #{value['error']}" if value['error'] }
          sample = { wall_ms: elapsed_wall * 1000, cpu_ms: elapsed_cpu * 1000, allocations: allocated }
          Marshal.dump({ json: JSON.generate(output), sample: sample }, writer)
          writer.close
          exit! 0
        rescue StandardError => error
          Marshal.dump({ error: "#{error.class}: #{error.message}" }, writer)
          writer.close
          exit! 1
        end
      end
      writer.close
      result = Marshal.load(reader)
      reader.close
      _, status = Process.waitpid2(pid)
      raise result.fetch(:error, 'Benchmark child failed') unless status.success?

      json = result.fetch(:json)
      expected ||= json
      raise "Outputs differ for #{variant}, run #{run}" unless expected == json
      next if run < warmups

      sample = result.fetch(:sample)
      samples[variant] << sample
      puts JSON.generate(kind: 'sample', variant: variant, run: run - warmups, **sample)
    end
  end
  classes.each do |variant, generators|
    site = make_site.call
    generators.reverse_each { |klass| klass.new.generate(site) }
    raise "Reverse order differs for #{variant}" unless JSON.generate(keys.to_h { |key| [key, site.data.fetch(key)] }) == expected
  end
end

median = ->(values) { values.sort.fetch(values.size / 2) }
summary = samples.transform_values do |measurements|
  %i[wall_ms cpu_ms allocations].to_h { |metric| [metric, median.call(measurements.map { |sample| sample.fetch(metric) })] }
end
puts JSON.pretty_generate(kind: 'summary', ruby: RUBY_DESCRIPTION, bibtex: Gem.loaded_specs.fetch('bibtex-ruby').version.to_s,
                          nokogiri: Nokogiri::VERSION, reference: reference, warmups: warmups, runs: runs,
                          bibliography_sha256: Digest::SHA256.file(File.join(root, '_bibliography/papers.bib')).hexdigest,
                          taxonomy_sha256: Digest::SHA256.file(taxonomy_path).hexdigest,
                          output_sha256: Digest::SHA256.hexdigest(expected), medians: summary)
