# frozen_string_literal: true

require 'minitest/autorun'
require 'jekyll'
require 'nokogiri'
require 'open3'
require 'json'

# Exercise the automation's actual output through the site's actual figure template.
class SubmissionFigureTest < Minitest::Test
  module Filters
    def responsive_image_candidates(_input)
      []
    end

    def relative_url(input)
      input
    end
  end

  def test_generated_alt_cannot_create_html_elements_or_attributes
    python = <<~PY
      import importlib.util, json
      spec = importlib.util.spec_from_file_location('blog', '.github/scripts/create_blog_post_from_issue.py')
      module = importlib.util.module_from_spec(spec)
      spec.loader.exec_module(module)
      alt = '\\" onload=\\"window.auditProof=true <script>bad</script>'
      figure = module.build_figure_include('assets/img/posts/safe.png', alt)
      module.validate_generated_body_markdown(figure)
      print(json.dumps({match.group('name'): match.group('value') for match in module.HTML_ATTRIBUTE_PATTERN.finditer(figure)}))
    PY
    stdout, stderr, status = Open3.capture3('python3', '-c', python)
    assert status.success?, stderr
    attrs = JSON.parse(stdout)
    assert_equal 'assets/img/posts/safe.png', attrs.fetch('path')
    template = Liquid::Template.parse(File.read('_includes/figure.liquid'))
    output = template.render!({'include' => attrs, 'site' => {}}, filters: [Filters])
    document = Nokogiri::HTML.fragment(output)
    assert_empty document.css('script')
    assert_nil document.at_css('img')['onload']
    assert_includes document.at_css('img')['alt'], '<script>bad</script>'
  end
end
