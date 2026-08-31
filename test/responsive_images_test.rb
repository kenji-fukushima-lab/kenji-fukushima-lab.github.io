# frozen_string_literal: true

require 'fileutils'
require 'jekyll'
require 'jekyll-imagemagick'
require 'minitest/autorun'
require 'ostruct'
require 'tmpdir'
require_relative '../_plugins/imagemagick_guard'
require_relative '../_plugins/responsive_images'

class ResponsiveImagesTest < Minitest::Test
  def test_small_images_have_one_honest_candidate_in_generation_and_html
    Dir.mktmpdir('responsive-images') do |dir|
      image = File.join(dir, 'assets/img/small.png')
      FileUtils.mkdir_p(File.dirname(image))
      system('convert', '-size', '200x287', 'xc:white', image, exception: true)
      site = Jekyll::Site.new(Jekyll.configuration(
        'source' => dir, 'destination' => File.join(dir, '_site'), 'plugins_dir' => [], 'plugins' => [],
        'imagemagick' => { 'enabled' => true, 'input_directories' => ['assets/img/'], 'input_formats' => ['.png'],
                          'output_formats' => { 'webp' => '-quality 80' }, 'widths' => [240, 480, 640] }
      ))
      Dir.chdir(dir) { JekyllImagemagick::ImageGenerator.new.generate(site) }
      assert_equal ['small-240.webp'], Dir[File.join(site.dest, 'assets/img/*.webp')].map { |path| File.basename(path) }
      assert_equal [200, 287], ResponsiveImageManifest.dimensions(File.join(site.dest, 'assets/img/small-240.webp'))

      template = Liquid::Template.parse(File.read(File.expand_path('../_includes/figure.liquid', __dir__)))
      output = template.render!({ 'include' => { 'path' => '/assets/img/small.png', 'alt' => 'Small image' } }, registers: { site: site })
      assert_includes output, '/assets/img/small-240.webp 200w'
      refute_includes output, 'small-480.webp'
      item = OpenStruct.new(output_ext: '.html', site: site, output: '<img src="/assets/img/small.png" alt="Small image">')
      ResponsiveImages.enhance(item)
      assert_includes item.output, '/assets/img/small-240.webp 200w'

      timestamp = File.mtime(image)
      system('convert', '-size', '400x100', 'xc:blue', image, exception: true)
      File.utime(timestamp, timestamp, image)
      assert_equal [400, 100], ResponsiveImages.image_dimensions(image)
      Dir.chdir(dir) { JekyllImagemagick::ImageGenerator.new.generate(site) }
      assert_equal [240, 60], ResponsiveImageManifest.dimensions(File.join(site.dest, 'assets/img/small-240.webp'))
    end
  end

  def test_widths_do_not_duplicate_an_exact_native_size
    assert_equal [240, 480], ResponsiveImageManifest.requested_widths(480, [240, 480, 640])
    assert_equal [240, 480, 640], ResponsiveImageManifest.requested_widths(1000, [240, 480, 640])
  end

  def test_failed_conversion_cannot_reuse_or_cache_a_stale_derivative
    Dir.mktmpdir('failed-image-conversion') do |dir|
      input = File.join(dir, 'source.png')
      output = File.join(dir, 'source-240.webp')
      system('convert', '-size', '300x200', 'xc:white', input, exception: true)
      File.write(output, 'stale output from an earlier build')
      Dir.chdir(dir) do
        error = assert_raises(Jekyll::Errors::FatalException) do
          JekyllImagemagick::ImageConvert.run(input, output, '-invalid-image-option', 240, '')
        end
        assert_includes error.message, 'Image conversion failed'
        refute File.exist?(output)
        assert_empty Dir[File.join(dir, '.jekyll-cache/imagemagick/*.webp')]
      end
    end
  end
end
