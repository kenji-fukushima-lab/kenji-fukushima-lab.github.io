# frozen_string_literal: true

require "cgi"
require "date"
require "jekyll/page_without_a_file"
require "nokogiri"
require "open3"
require "pathname"
require "time"
require "yaml"

module GeneratedSiteIndexes
  class Generator < Jekyll::Generator
    safe true
    priority :high

    def generate(site)
      builder = Builder.new(site)
      site.data["generated_posts_by_lang"] = builder.posts_by_lang_for_liquid
      site.pages << builder.sitemap_page if site.active_lang == site.default_lang
    end
  end

  class Builder
    def initialize(site)
      @site = site
      @source = Pathname.new(site.source)
      @default_lang = site.config["default_lang"].to_s
      @languages = Array(site.config["languages"])
      @site_url = site.config["url"].to_s.sub(%r{/+\z}, "")
      @baseurl = site.config["baseurl"].to_s
      @collections = site.config.fetch("collections", {})
      @sitemap_lastmod_dependencies = site.config.fetch("sitemap_lastmod_dependencies", {})
      @blog_page_cache = {}
      @git_lastmod_cache = {}
      @source_posts = site.instance_variable_get(:@generated_index_posts)
    end

    def posts_by_lang_for_liquid
      @posts_by_lang_for_liquid ||= begin
        posts_by_lang = @languages.each_with_object({}) do |lang, memo|
          memo[lang.to_s] = []
        end

        source_posts.group_by { |post| post[:lang] }.each do |lang, posts|
          posts_by_lang[lang] = posts
            .sort_by { |post| post[:date] }
            .reverse
            .map { |post| liquid_post(post) }
        end

        posts_by_lang
      end
    end

    def sitemap_page
      page = Jekyll::PageWithoutAFile.new(@site, @site.source, "", "sitemap.xml")
      page.content = build_sitemap_xml
      page.data["layout"] = nil
      page.data["sitemap"] = false
      page.data["lang"] = @default_lang
      page.data["permalink"] = "/sitemap.xml"
      page
    end

    private

    def build_sitemap_xml
      entries = page_entries + news_entries + project_entries + post_entries + archive_entries
      deduped = entries
        .group_by { |entry| entry[:loc] }
        .map { |loc, grouped| { :loc => loc, :lastmod => grouped.map { |entry| entry[:lastmod] }.compact.max } }
        .sort_by { |entry| entry[:loc] }

      lines = []
      lines << %(<?xml version="1.0" encoding="UTF-8"?>)
      lines << %(<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">)
      deduped.each do |entry|
        lines << %(  <url>)
        lines << %(    <loc>#{xml_escape(entry[:loc])}</loc>)
        lines << %(    <lastmod>#{entry[:lastmod].utc.iso8601}</lastmod>) if entry[:lastmod]
        lines << %(  </url>)
      end
      lines << %(</urlset>)
      lines.join("\n")
    end

    def page_entries
      Dir[@source.join("_pages", "*", "*.md").to_s].filter_map do |path|
        entry_from_page(Pathname.new(path))
      end
    end

    def entry_from_page(path)
      data, = parse_source_file(path)
      return nil if excluded_from_sitemap?(data)

      lang = path.parent.basename.to_s
      permalink = data["permalink"].to_s.strip
      return nil if permalink.empty?

      {
        :loc => absolute_url(localized_path(lang, permalink)),
        :lastmod => page_lastmod(path, data)
      }
    end

    def page_lastmod(path, data)
      dependency_paths = Array(@sitemap_lastmod_dependencies[data["page_id"].to_s])
      source_paths = [path] + dependency_paths.map { |dependency| @source.join(dependency.to_s) }
      git_times = source_paths.filter_map { |source_path| git_last_modified(source_path) }

      ([parse_time(data["last_updated"])] + git_times).compact.max
    end

    def git_last_modified(path)
      expanded_path = Pathname.new(path).expand_path
      return nil unless expanded_path.to_s.start_with?("#{@source.expand_path}#{File::SEPARATOR}")
      return nil unless expanded_path.file?

      relative_path = expanded_path.relative_path_from(@source.expand_path).to_s
      return @git_lastmod_cache[relative_path] if @git_lastmod_cache.key?(relative_path)

      output, status = Open3.capture2e(
        "git",
        "-C",
        @source.to_s,
        "log",
        "-1",
        "--format=%cI",
        "--",
        relative_path
      )
      @git_lastmod_cache[relative_path] = status.success? ? parse_time(output.lines.first) : nil
    rescue Errno::ENOENT, ArgumentError
      nil
    end

    def news_entries
      Dir[@source.join("_news", "*", "*.md").to_s].filter_map do |path|
        collection_entry(Pathname.new(path), "news")
      end
    end

    def project_entries
      Dir[@source.join("_projects", "*", "*.md").to_s].filter_map do |path|
        collection_entry(Pathname.new(path), "projects")
      end
    end

    def collection_entry(path, collection_name)
      data, = parse_source_file(path)
      return nil if excluded_from_sitemap?(data)

      lang = path.parent.basename.to_s
      slug = path.basename(".md").to_s
      permalink = data["permalink"].to_s.strip
      permalink = collection_permalink(collection_name, slug) if permalink.empty?

      {
        :loc => absolute_url(localized_path(lang, permalink)),
        :lastmod => parse_time(data["last_updated"]) || parse_time(data["date"])
      }
    end

    def collection_permalink(collection_name, slug)
      collection_config = @collections.fetch(collection_name, {})
      template = collection_config.fetch("permalink", "/:collection/:title/").to_s
      template
        .gsub(":collection", collection_name)
        .gsub(":title", slug)
    end

    def post_entries
      source_posts.map do |post|
        {
          :loc => absolute_url(post[:url]),
          :lastmod => post[:updated]
        }
      end
    end

    def archive_entries
      entries = []

      source_posts.group_by { |post| post[:lang] }.each do |lang, posts|
        entries << {
          :loc => absolute_url(localized_path(lang, "/blog/")),
          :lastmod => posts.map { |post| post[:updated] }.max
        }
      end

      source_posts.group_by { |post| [post[:lang], post[:year]] }.each do |(lang, year), posts|
        entries << {
          :loc => absolute_url(localized_path(lang, "/blog/#{year}/")),
          :lastmod => posts.map { |post| post[:updated] }.max
        }
      end

      entries
    end

    def source_posts
      @source_posts ||= @site.posts.docs.filter_map do |document|
        build_post(document)
      end
    end

    def build_post(document)
      data = document.data
      return nil if data["draft"] == true || data["published"] == false
      return nil unless @site.publisher.publish?(document)

      lang = data["lang"] || document.relative_path.split("/").find { |part| @languages.include?(part) } || @default_lang
      date = document.date
      updated = parse_time(data["last_updated"]) || date
      summary = data["description"].to_s.strip
      if summary.empty?
        summary = plain_text_excerpt(document.content)
      end
      summary = strip_html(summary)
      url = document.url
      url = url.gsub(@site.document_url_regex, "/") if @site.respond_to?(:document_url_regex)

      {
        :lang => lang,
        :year => date.strftime("%Y"),
        :url => localized_path(lang, url),
        :title => data["title"].to_s.strip,
        :author => strip_html(data["author"].to_s),
        :date => date,
        :updated => updated,
        :tags => Array(data["tags"]).map(&:to_s).reject(&:empty?),
        :categories => Array(data["categories"]).map(&:to_s).reject(&:empty?),
        :summary => summary
      }
    end

    def liquid_post(post)
      {
        "lang" => post[:lang],
        "url" => post[:url],
        "title" => post[:title],
        "author" => post[:author],
        "date" => post[:date].utc.iso8601,
        "updated" => post[:updated].utc.iso8601,
        "tags" => post[:tags],
        "categories" => post[:categories],
        "summary" => post[:summary]
      }
    end

    def parse_source_file(path)
      contents = path.read
      match = contents.match(/\A---\s*\n(.*?)\n---\s*\n/m)
      return [{}, contents] unless match

      data = YAML.safe_load(match[1], :permitted_classes => [Date, Time], :aliases => true) || {}
      [data, match.post_match]
    end

    def excluded_from_sitemap?(data)
      return true if data["sitemap"] == false
      return true if data["redirect"]

      data["robots"].to_s.downcase.include?("noindex")
    end

    def localized_path(lang, path)
      normalized = path.start_with?("/") ? path : "/#{path}"
      return normalized if lang == @default_lang
      return normalized if normalized == "/#{lang}" || normalized.start_with?("/#{lang}/")

      "/#{lang}#{normalized}"
    end

    def absolute_url(path)
      "#{@site_url}#{@baseurl}#{path}"
    end

    def parse_time(value)
      return nil if value.nil? || value.to_s.strip.empty?

      Time.parse(value.to_s).utc
    rescue ArgumentError
      nil
    end

    def xml_escape(value)
      CGI.escapeHTML(value.to_s)
    end

    def strip_html(value)
      Nokogiri::HTML::DocumentFragment.parse(value).text.gsub(/\s+/, " ").strip
    end

    def plain_text_excerpt(body)
      body.to_s
        .gsub(/\{[%{].*?[}%]\}/m, " ")
        .gsub(/!\[[^\]]*\]\([^)]+\)/, " ")
        .gsub(/\[([^\]]+)\]\([^)]+\)/, '\1')
        .gsub(/<[^>]+>/, " ")
        .gsub(/^\s*(?:[#>\-\*\+]+|\d+\.)\s+/, "")
        .gsub(/[`*_~]/, " ")
        .gsub(/\s+/, " ")
        .strip[0, 280].to_s
    end

    public :source_posts
  end
end

# Capture native, publishable documents before Polyglot coordinates translations
# at normal post_read priority. Each language/read gets a fresh snapshot, so
# watch rebuilds and the default-language sitemap see the same eligible posts.
Jekyll::Hooks.register :site, :post_read, :priority => :high do |site|
  site.instance_variable_set(:@generated_index_posts, nil)
  posts = GeneratedSiteIndexes::Builder.new(site).source_posts
  site.instance_variable_set(:@generated_index_posts, posts)
end
