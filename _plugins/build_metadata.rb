# frozen_string_literal: true

require 'json'

# Browser checks must never silently consume output from jekyll serve.
Jekyll::Hooks.register :site, :post_write do |site|
  File.write(File.join(site.dest, 'build-info.json'), JSON.generate({
    'environment' => ENV.fetch('JEKYLL_ENV', 'development'),
    'version' => File.read(File.join(site.source, 'VERSION')).strip
  }))
end
