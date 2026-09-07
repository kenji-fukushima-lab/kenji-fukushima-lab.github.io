# frozen_string_literal: true

require "minitest/autorun"
require "yaml"
require "liquid"
require_relative "../_plugins/hide-custom-bibtex"

class HideCustomBibtexTest < Minitest::Test
  def test_site_config_filters_website_and_url_without_removing_doi
    config = YAML.load_file(File.expand_path("../_config.yml", __dir__))
    site = Struct.new(:config).new(config)
    bibtex = "@article{example,\n  title = {Example},\n  website = {https://example.org},\n  url = {https://example.org/paper},\n  doi = {10.1234/example},\n}\n"
    output = Liquid::Template.parse("{{ bibtex | hideCustomBibtex }}").render!(
      { "bibtex" => bibtex }, registers: { site: site }
    )
    refute_match(/website\s*=/, output)
    refute_match(/url\s*=/, output)
    assert_includes output, "doi = {10.1234/example}"
    assert_includes output, "title = {Example}"
  end
end
