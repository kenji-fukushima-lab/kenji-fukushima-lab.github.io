# frozen_string_literal: true

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
