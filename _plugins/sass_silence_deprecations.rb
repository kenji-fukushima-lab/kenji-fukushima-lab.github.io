# frozen_string_literal: true

# Pass through optional Dart Sass deprecation controls from `_config.yml`:
#
# sass:
#   silence_deprecations: [import, global-builtin]
#
# jekyll-sass-converter currently forwards quiet_deps/verbose, but not
# silence_deprecations. This patch keeps behavior unchanged unless the new
# key is present.
module SassSilenceDeprecationsPatch
  private

  def sass_configs
    configs = super
    setting = jekyll_sass_configuration["silence_deprecations"]
    return configs if setting.nil? || setting == false

    values = Array(setting).map(&:to_s).reject(&:empty?)
    return configs if values.empty?

    configs.merge(:silence_deprecations => values)
  end
end

Jekyll::Converters::Scss.prepend(SassSilenceDeprecationsPatch)
