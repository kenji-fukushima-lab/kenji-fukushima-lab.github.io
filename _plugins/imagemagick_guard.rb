# frozen_string_literal: true

require "digest"
require "fileutils"

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
end

# Keep conversions in Jekyll's ignored cache directory. Clean CI builds can
# restore this directory and copy unchanged derivatives instead of invoking
# ImageMagick hundreds of times.
module CachedImageConvert
  CACHE_VERSION = "v1"

  def run(input_file, output_file, flags, long_edge, resize_flags)
    digest = Digest::SHA256.new
    digest << CACHE_VERSION << "\0" << File.binread(input_file)
    digest << "\0" << flags.to_s << "\0" << long_edge.to_s << "\0" << resize_flags.to_s

    cache_directory = File.join(Dir.pwd, ".jekyll-cache", "imagemagick")
    cache_file = File.join(cache_directory, "#{digest.hexdigest}#{File.extname(output_file)}")
    FileUtils.mkdir_p(cache_directory)

    if File.file?(cache_file)
      FileUtils.cp(cache_file, output_file)
      return
    end

    super
    FileUtils.cp(output_file, cache_file) if File.file?(output_file)
  end
end

JekyllImagemagick::ImageGenerator.prepend(SingleLocaleImageGenerator)
JekyllImagemagick::ImageConvert.singleton_class.prepend(CachedImageConvert)
