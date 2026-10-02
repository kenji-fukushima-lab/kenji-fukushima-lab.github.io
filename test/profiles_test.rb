# frozen_string_literal: true

require 'minitest/autorun'
require 'jekyll'
require 'nokogiri'

class ProfilesTest < Minitest::Test
  module Filters
    def relative_url(input)
      input
    end

    def bust_file_cache(input)
      input
    end
  end

  def render_profile(profile, language)
    source = File.read('_layouts/profiles.liquid').sub(/\A---.*?---\s*/m, '')
    context = {
      'page' => {'position_order' => ['researcher'], 'lang' => language},
      'site' => {'active_lang' => language, 'profiles' => [profile], 'data' => {language => {'strings' => {'positions' => {}}}}}
    }
    output = Liquid::Template.parse(source).render!(context, filters: [Jekyll::Filters, Filters])
    Nokogiri::HTML.fragment(output)
  end

  def test_profile_names_and_all_links_cannot_inject_attributes
    name = 'Alice" onmouseover="window.auditProof=true" data-audit="'
    value = 'https://example.invalid/" onclick="window.auditProof=true" data-audit="'
    fields = %w[email website orcid google_scholar github linkedin twitter researchgate amazon amazon_author instagram facebook youtube researchmap tayo]
    %w[en-us ja].each do |language|
      fields.each do |field|
        profile = {'name' => name, 'path' => 'current_members/alice.md', 'position_key' => 'researcher', field => value}
        document = render_profile(profile, language)
        link = document.at_css('a.people-social-link')
        refute_nil link, "#{language}: #{field}"
        prefix = field == 'email' ? 'mailto:' : field == 'github' ? 'https://github.com/' : ''
        assert_equal prefix + value, link['href']
        assert_includes link['aria-label'], name
        assert_equal name, document.at_css('.people-name').text.strip
        assert_empty document.css('[onclick], [onmouseover], [data-audit], script')
      end
    end
  end

  def test_each_new_social_link_displays_without_a_position_or_other_links
    {'instagram' => 'Instagram', 'facebook' => 'Facebook', 'youtube' => 'YouTube'}.each do |field, label|
      %w[en-us ja].each do |language|
        url = "https://example.org/#{field}?a=1&b=2"
        profile = {'name' => 'Member', 'path' => 'current_members/member.md', 'position_key' => 'researcher', field => url}
        document = render_profile(profile, language)
        assert_equal 1, document.css('a.people-social-link').length
        link = document.at_css('a.people-social-link')
        assert_equal url, link['href']
        assert_equal label, link['data-tooltip']
        assert_equal "#{label} profile of Member", link['aria-label']
        refute_nil link.at_css(".fa-#{field}[aria-hidden=true]")
      end
    end
  end
end
