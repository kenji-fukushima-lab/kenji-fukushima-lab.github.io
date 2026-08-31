# frozen_string_literal: true

require "jekyll"

# Scheduled sources stay on the reviewed branch. Publication never needs a bot
# commit or a branch-protection bypass; Jekyll's publisher owns the date rules.
module ScheduledPosts
  class Document < Jekyll::Document
    # Jekyll treats documents outside _posts as drafts and derives categories
    # from that path. Expose the native collection path while retaining `path`
    # as the real, unchanged _scheduled source used to read the file.
    def relative_path
      super.sub(%r{\A_scheduled/}, "_posts/")
    end
  end

  class Reader < Jekyll::PostReader
    def read_content(dir, magic_dir, matcher)
      site.reader.get_entries(dir, magic_dir).filter_map do |entry|
        next unless matcher.match?(entry)

        path = site.in_source_dir(File.join(dir, magic_dir, entry))
        Document.new(path, :site => site, :collection => site.posts)
      end
    end
  end

  module_function

  def read(site)
    directory = File.join(site.source, "_scheduled")
    return unless File.directory?(directory)

    languages = Array(site.config["languages"])
    Dir[File.join(directory, "**", "*.md")].each do |source|
      relative = source.delete_prefix("#{directory}/").split("/")
      unless relative.length == 2 && languages.include?(relative.first) && Jekyll::Document::DATE_FILENAME_MATCHER.match?(relative.last)
        raise Jekyll::Errors::FatalException, "Invalid scheduled post path: #{source}"
      end
      target = File.join(site.source, "_posts", *relative)
      if File.exist?(target)
        raise Jekyll::Errors::FatalException, "Scheduled post conflicts with an existing post: #{target}"
      end
    end

    documents = Reader.new(site).read_publishable("", "_scheduled", Jekyll::Document::DATE_FILENAME_MATCHER)
    documents.reject! { |document| document.data["draft"] == true }
    documents.each do |document|
      document.data["lang"] ||= document.relative_path.split("/")[1]
    end
    site.posts.docs.concat(documents).sort!
  end
end

# Run before the shared feed snapshot and Polyglot's translation coordination.
Jekyll::Hooks.register :site, :post_read, :priority => 40 do |site|
  ScheduledPosts.read(site)
end
