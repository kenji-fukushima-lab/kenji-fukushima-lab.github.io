# frozen_string_literal: true

require "cgi"
require "digest"
require "open3"

# One source of truth for image generation, Liquid pictures and Markdown images.
module ResponsiveImageManifest
  module_function

  @dimensions = {}
  @digests = {}

  def fingerprint(path)
    stat = File.stat(path)
    [stat.ino, stat.size, stat.mtime.to_r, stat.ctime.to_r]
  end

  def dimensions(path)
    signature = fingerprint(path)
    cached = @dimensions[path]
    return cached[:value] if cached && cached[:signature] == signature

    # Ping reads dimensions without decoding the full image. A GIF can contain
    # several frames; use the first frame, as the browser does for intrinsic size.
    output, _error, status = Open3.capture3("identify", "-ping", "-format", "%w %h\n", path)
    size = status.success? ? output.lines.first.to_s.split.map(&:to_i) : []
    value = size.length == 2 && size.all?(&:positive?) ? size : nil
    @dimensions[path] = { :signature => signature, :value => value }
    value
  rescue Errno::ENOENT
    @dimensions.delete(path)
    nil
  end

  # Inspect the first frame of many images in one process. Batching avoids a
  # process launch per source image on every build.
  def prime_dimensions(paths)
    pending = paths.filter_map do |path|
      signature = fingerprint(path)
      cached = @dimensions[path]
      [path, signature] unless cached && cached[:signature] == signature
    end
    pending.each_slice(100) do |batch|
      output, error, status = Open3.capture3(
        "identify", "-ping", "-format", "%w %h\n", *batch.map { |path, _signature| "#{path}[0]" }
      )
      sizes = output.lines.map { |line| line.split.map(&:to_i) }
      unless status.success? && sizes.length == batch.length && sizes.all? { |size| size.length == 2 && size.all?(&:positive?) }
        raise Jekyll::Errors::FatalException, "Cannot inspect responsive images: #{error.strip}"
      end
      batch.zip(sizes).each do |(path, signature), size|
        @dimensions[path] = { :signature => signature, :value => size }
      end
    end
  end

  def digest(path)
    signature = fingerprint(path)
    cached = @digests[path]
    return cached[:value] if cached && cached[:signature] == signature

    value = Digest::SHA256.file(path).hexdigest
    @digests[path] = { :signature => signature, :value => value }
    value
  end

  def requested_widths(natural_width, widths)
    configured = Array(widths).map(&:to_i).select(&:positive?).uniq.sort
    return configured unless natural_width

    selected = configured.select { |width| width < natural_width }
    ceiling = configured.find { |width| width >= natural_width }
    selected << ceiling if ceiling
    selected
  end

  def candidates(path, natural_width, widths)
    stem = path.sub(/\.[^.\/]+\z/, "")
    requested_widths(natural_width, widths).map do |width|
      { "path" => "#{stem}-#{width}.webp", "width" => [width, natural_width].compact.min }
    end
  end

  def resolve(site, src)
    path = src.to_s.split(/[?#]/, 2).first
    return if path.nil? || path.empty? || path.start_with?("//") || path.match?(%r{\A[a-z][a-z0-9+.-]*:}i)

    baseurl = site.baseurl.to_s.sub(%r{/\z}, "")
    path = path.delete_prefix(baseurl) unless baseurl.empty?
    relative = CGI.unescape(path.sub(%r{\A/+}, ""))
    absolute = File.expand_path(relative, site.source)
    return unless absolute.start_with?("#{File.expand_path(site.source)}/") && File.file?(absolute)

    [path, absolute]
  end

  def for_source(site, src)
    config = site.config.fetch("imagemagick", {})
    return [] unless config["enabled"]

    resolved = resolve(site, src)
    return [] unless resolved

    path, absolute = resolved
    return [] unless Array(config["input_formats"]).include?(File.extname(absolute).downcase)

    size = dimensions(absolute)
    raise Jekyll::Errors::FatalException, "Cannot read responsive image dimensions: #{absolute}" unless size

    candidates(path, size.first, config["widths"])
  end

  module LiquidFilters
    def responsive_image_candidates(src)
      ResponsiveImageManifest.for_source(@context.registers[:site], src)
    end
  end
end

Liquid::Template.register_filter(ResponsiveImageManifest::LiquidFilters)
