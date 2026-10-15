# based on https://distresssignal.org/busting-css-cache-with-jekyll-md5-hash
# https://gist.github.com/BryanSchuetz/2ee8c115096d7dd98f294362f6a667db
module Jekyll
  module CacheBust
    class CacheDigester
      require 'digest/md5'
      require 'pathname'

      attr_accessor :file_name, :directory

      def initialize(file_name:, directory: nil, source: Dir.pwd, cache: nil)
        self.file_name = file_name
        self.directory = directory
        @source = source
        @cache = cache
      end

      def digest!
        # Every page references the same assets. Share their digests for this
        # site read, then discard them when Jekyll resets for a watch rebuild.
        key = directory ? [:directory, File.expand_path(directory, @source)] : [:file, local_file_path]
        checksum = if @cache
                     @cache.fetch(key) { @cache[key] = Digest::MD5.hexdigest(file_contents) }
                   else
                     Digest::MD5.hexdigest(file_contents)
                   end
        [file_name, '?', checksum].join
      end

      private

      def directory_files_content
        target_path = File.join(File.expand_path(directory, @source), '**', '*')
        Dir[target_path].map{|f| File.read(f) unless File.directory?(f) }.join
      end

      def file_content
        File.read(local_file_path)
      end

      def local_file_path
        File.expand_path(file_name.slice((file_name.index('assets/')..-1)), @source)
      end

      def file_contents
        is_directory? ? file_content : directory_files_content
      end

      def is_directory?
        directory.nil?
      end
    end

    def bust_file_cache(file_name)
      cache_digest(file_name, nil)
    end

    def bust_css_cache(file_name)
      cache_digest(file_name, '_sass')
    end

    private

    def cache_digest(file_name, directory)
      site = @context&.registers&.[](:site)
      cache = if site
                site.instance_variable_get(:@cache_bust_digests) || site.instance_variable_set(:@cache_bust_digests, {})
              end
      CacheDigester.new(file_name: file_name, directory: directory, source: site ? site.source : Dir.pwd, cache: cache).digest!
    end
  end
end

Liquid::Template.register_filter(Jekyll::CacheBust)

Jekyll::Hooks.register :site, :after_reset do |site|
  site.instance_variable_set(:@cache_bust_digests, {})
end
