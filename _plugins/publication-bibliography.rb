# frozen_string_literal: true

require 'jekyll'

# Share parsing work within one site build while returning independent entries.
module PublicationBibliography
  module_function

  def read(site, path)
    source = File.read(path, encoding: 'utf-8')
    cached = site.instance_variable_get(:@publication_bibliography)
    unless cached && cached[:path] == path && cached[:source] == source
      cached = { path: path, source: source, bibliography: BibTeX::Bibliography.parse(source) }
      cached[:bibliography].path = path
      site.instance_variable_set(:@publication_bibliography, cached)
    end
    cached[:bibliography].dup
  end
end

Jekyll::Hooks.register :site, :after_reset do |site|
  site.remove_instance_variable(:@publication_bibliography) if site.instance_variable_defined?(:@publication_bibliography)
end
