# frozen_string_literal: true

require 'digest'
require 'fileutils'
require 'json'
require 'open3'
require 'tempfile'

module TerserCache
  class Compiler
    VERSION = '1'

    def self.runtime_signature
      @runtime_signature ||= begin
        node, status = Open3.capture2('node', '--version')
        raise 'Cannot identify the JavaScript runtime' unless status.success?

        [::Terser::VERSION, Digest::SHA256.file(::Terser::SourcePath).hexdigest,
         Digest::SHA256.file(::Terser::TerserJSWrapperPath).hexdigest, node.strip, RUBY_VERSION].join(':')
      end
    end

    def initialize(compiler, directory, options, signature: self.class.runtime_signature)
      @compiler = compiler
      @directory = directory
      @signature = [VERSION, signature, JSON.generate(options)].join("\0")
    end

    def compile(source)
      key = Digest::SHA256.hexdigest(@signature + "\0" + source)
      file = File.join(@directory, "#{key}.json")
      if File.file?(file)
        begin
          cached = JSON.parse(File.read(file))
          output = cached.is_a?(Hash) && cached['output']
          return output if output.is_a?(String) && cached['sha256'] == Digest::SHA256.hexdigest(output)
        rescue JSON::ParserError
          # A damaged cache entry is regenerated from the original source.
        end
      end

      output = @compiler.compile(source)
      raise 'Terser returned a non-string result' unless output.is_a?(String)

      FileUtils.mkdir_p(@directory)
      Tempfile.create(['compile-', '.tmp'], @directory) do |temporary|
        temporary.write(JSON.generate('output' => output, 'sha256' => Digest::SHA256.hexdigest(output)))
        temporary.close
        File.rename(temporary.path, file)
      end
      output
    end
  end

  module JSFile
    def write(destination_root)
      cache_directory = File.join(File.expand_path(@site.config.fetch('cache_dir', '.jekyll-cache'), @site.source), 'terser')
      @cached_compiler ||= Compiler.new(@terser, cache_directory, @site.config.fetch('terser', {}))
      compiled = @cached_compiler.compile(File.read(path))
      target = destination(destination_root)
      return false if File.file?(target) && File.read(target) == compiled

      FileUtils.mkdir_p(File.dirname(target))
      File.write(target, compiled)
      true
    rescue StandardError => error
      raise Jekyll::Errors::FatalException, "JavaScript compilation failed for #{path}: #{error.message}"
    end
  end
end

Jekyll::Terser::JSFile.prepend(TerserCache::JSFile)
