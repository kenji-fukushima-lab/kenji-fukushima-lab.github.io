# frozen_string_literal: true

require "digest"
require "fileutils"
require "shellwords"
require_relative "responsive_image_manifest"

# jekyll-imagemagick shells out to `convert`. On systems without ImageMagick,
# this creates noisy per-file warnings during build. Disable the generator
# automatically in that case; if `convert` exists, behavior is unchanged.
Jekyll::Hooks.register :site, :after_init do |site|
  config = site.config["imagemagick"]
  next unless config.is_a?(Hash) && config["enabled"]
  next if system("command -v convert >/dev/null 2>&1")

  config["enabled"] = false
  Jekyll.logger.info("Imagemagick", "disabled: `convert` not found on PATH")
end

# Polyglot invokes generators once per language. All localized pages reference
# the shared /assets tree, so generating the same derivatives below /ja/assets
# only increases build time and deployment size.
module SingleLocaleImageGenerator
  def generate(site)
    active_language = site.respond_to?(:active_lang) ? site.active_lang.to_s : site.config["active_lang"].to_s
    default_language = site.config["default_lang"].to_s

    if !active_language.empty? && !default_language.empty? && active_language != default_language
      Jekyll.logger.info(JekyllImagemagick::LOG_PREFIX, "Skipping shared images for #{active_language}")
      return
    end

    super
  end

  private

  def compute_transformations(site, files, formats, edges)
    ResponsiveImageManifest.prime_dimensions(files)
    files.flat_map do |file|
      dimensions = ResponsiveImageManifest.dimensions(file)
      raise Jekyll::Errors::FatalException, "Cannot read image dimensions: #{file}" unless dimensions

      widths = ResponsiveImageManifest.requested_widths(dimensions.first, edges)
      widths << 0 if edges.include?(0)
      super(site, [file], formats, widths)
    end
  end

  # Check content fingerprints, not only timestamps in _site. Replacing an image
  # while preserving its mtime must still invalidate its generated derivatives.
  def generate_files(site, tuples, formats)
    converted = 0
    tuples.each do |input, output, edge|
      extension = File.extname(output).delete_prefix(".")
      converted += 1 if JekyllImagemagick::ImageConvert.run(input, output, formats[extension], edge, @config["resize_flags"])
      raise Jekyll::Errors::FatalException, "Image conversion did not produce #{output}" unless File.file?(output)

      prefix = File.dirname(input.delete_prefix(site.source))
      site.static_files << JekyllImagemagick::ImageFile.new(site, site.dest, prefix, File.basename(output))
    end
    converted
  end
end

# Keep conversions in Jekyll's ignored cache directory. Clean CI builds can
# restore this directory and copy unchanged derivatives instead of invoking
# ImageMagick hundreds of times.
module CachedImageConvert
  CACHE_VERSION = "v2"

  def run(input_file, output_file, flags, long_edge, resize_flags)
    digest = Digest::SHA256.new
    @converter_version ||= Open3.capture2("convert", "-version").first.lines.first.to_s
    digest << CACHE_VERSION << @converter_version << "\0" << ResponsiveImageManifest.digest(input_file)
    digest << "\0" << flags.to_s << "\0" << long_edge.to_s << "\0" << resize_flags.to_s

    cache_directory = File.join(Dir.pwd, ".jekyll-cache", "imagemagick")
    cache_file = File.join(cache_directory, "#{digest.hexdigest}#{File.extname(output_file)}")
    FileUtils.mkdir_p(cache_directory)

    if File.file?(cache_file)
      FileUtils.cp(cache_file, output_file) unless File.file?(output_file) && FileUtils.compare_file(cache_file, output_file)
      return false
    end

    FileUtils.rm_f(output_file)
    command = ["convert", input_file, *Shellwords.split(flags.to_s)]
    command.concat(["-resize", "#{long_edge}>", *Shellwords.split(resize_flags.to_s)]) unless long_edge.zero?
    command << output_file
    _output, error, status = Open3.capture3(*command)
    unless status.success? && File.file?(output_file) && File.size(output_file).positive?
      FileUtils.rm_f(output_file)
      raise Jekyll::Errors::FatalException, "Image conversion failed for #{input_file}: #{error.strip}"
    end
    FileUtils.cp(output_file, cache_file)
    true
  end
end

JekyllImagemagick::ImageGenerator.prepend(SingleLocaleImageGenerator)
JekyllImagemagick::ImageConvert.singleton_class.prepend(CachedImageConvert)
