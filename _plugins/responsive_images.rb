# frozen_string_literal: true

require "cgi"
require "nokogiri"
require "open3"

# Enhance local images written directly in Markdown/HTML. Images emitted by
# figure.liquid already have responsive <picture> markup, so its marker limits
# this hook to intrinsic-dimension normalization.
module ResponsiveImages
  module_function

  @dimension_cache = {}

  def image_dimensions(path)
    return @dimension_cache[path] if @dimension_cache.key?(path)

    output, status = Open3.capture2("identify", "-format", "%w %h", path)
    dimensions = status.success? ? output.split.map(&:to_i) : []
    @dimension_cache[path] = dimensions.length == 2 && dimensions.all?(&:positive?) ? dimensions : nil
  rescue Errno::ENOENT
    @dimension_cache[path] = nil
  end

  def source_path(site, src)
    path = src.split(/[?#]/, 2).first
    return if path.nil? || path.empty? || path.start_with?("//")
    return if path.match?(%r{\A[a-z][a-z0-9+.-]*:}i)

    baseurl = site.baseurl.to_s.sub(%r{/\z}, "")
    path = path.delete_prefix(baseurl) unless baseurl.empty?
    relative_path = CGI.unescape(path.sub(%r{\A/+}, ""))
    absolute_path = File.expand_path(relative_path, site.source)
    source_root = File.expand_path(site.source)
    return unless absolute_path.start_with?("#{source_root}/") && File.file?(absolute_path)

    [path, absolute_path]
  end

  def responsive_candidates(path, natural_width, widths)
    stem = path.sub(/\.[^.\/]+\z/, "")
    selected = widths.select { |width| natural_width.nil? || width <= natural_width }
    selected << widths.find { |width| natural_width && width > natural_width } if natural_width && selected.length < widths.length
    selected = [widths.first].compact if selected.empty?

    selected.map do |width|
      descriptor = natural_width && width > natural_width ? natural_width : width
      "#{stem}-#{width}.webp #{descriptor}w"
    end.uniq.join(", ")
  end

  def enhance(item)
    return unless item.output_ext == ".html" && item.output.include?("<img")

    site = item.site
    config = site.config.fetch("imagemagick", {})
    return unless config["enabled"]

    supported_formats = Array(config["input_formats"]).map(&:downcase)
    widths = Array(config["widths"]).map(&:to_i).select(&:positive?).sort
    return if widths.empty?

    first_responsive_image = true
    item.output = item.output.gsub(/<img\b[^>]*>/i) do |tag|
      src = ""
      fragment = Nokogiri::HTML::DocumentFragment.parse(tag)
      image = fragment.at_css("img")
      next tag unless image
      already_responsive = image.key?("data-responsive-image")
      next tag if image.key?("srcset") && !already_responsive

      src = image["src"].to_s
      resolved = source_path(site, src)
      next tag unless resolved

      public_path, absolute_path = resolved
      dimensions = image_dimensions(absolute_path)
      natural_width, natural_height = dimensions

      if natural_width && natural_height
        declared_width = image["width"].to_s[/\A\d+\z/].to_i
        declared_height = image["height"].to_s[/\A\d+\z/].to_i
        if declared_width.positive?
          image["width"] = declared_width.to_s
          image["height"] = ((declared_width * natural_height.to_f) / natural_width).round.to_s unless declared_height.positive?
        elsif declared_height.positive?
          image["width"] = ((declared_height * natural_width.to_f) / natural_height).round.to_s
          image["height"] = declared_height.to_s
        else
          image["width"] = natural_width.to_s
          image["height"] = natural_height.to_s
        end
      end

      unless supported_formats.include?(File.extname(absolute_path).downcase)
        image["decoding"] ||= "async"
        image["data-responsive-image"] = ""
        next fragment.to_html
      end

      unless already_responsive
        image["srcset"] = responsive_candidates(public_path, natural_width, widths)

        unless image.key?("sizes")
          declared_width = image["width"].to_s[/\A\d+\z/].to_i
          max_width = image["style"].to_s[/max-width:\s*(\d+)px/i, 1].to_i
          display_width = declared_width.positive? ? declared_width : max_width
          image["sizes"] = display_width.positive? ? "(max-width: #{display_width}px) 95vw, #{display_width}px" : "95vw"
        end
      end

      unless already_responsive || image.key?("loading")
        image["loading"] = first_responsive_image ? "eager" : "lazy"
        image["fetchpriority"] = "high" if first_responsive_image
      end
      image["decoding"] ||= "async"
      image["data-responsive-image"] = ""
      first_responsive_image = false
      fragment.to_html
    rescue StandardError => e
      Jekyll.logger.warn("ResponsiveImages", "skipped #{src}: #{e.message}")
      tag
    end
  end
end

Jekyll::Hooks.register %i[pages documents], :post_render do |item|
  ResponsiveImages.enhance(item)
end
