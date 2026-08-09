# frozen_string_literal: true

# Generate Pagefind assets automatically after Jekyll writes the site so
# plain `jekyll build` / `jekyll serve` outputs always contain the search bundle.
Jekyll::Hooks.register :site, :post_write do |site|
  next unless site.config["search_enabled"]

  active_language = site.respond_to?(:active_lang) ? site.active_lang.to_s : site.config["active_lang"].to_s
  languages = Array(site.config["languages"]).map(&:to_s)
  next if languages.any? && !active_language.empty? && active_language != languages.last

  development_build = ENV["JEKYLL_ENV"].to_s == "development"
  python_candidates = [
    ENV["PAGEFIND_PYTHON"],
    "python3",
    "/usr/bin/python3",
    "python",
  ].compact.uniq

  python = python_candidates.find do |candidate|
    system(candidate, "-m", "pagefind", "--version", out: File::NULL, err: File::NULL)
  end

  unless python
    if development_build
      Jekyll.logger.warn("Pagefind", "skipping indexing in development because pagefind is unavailable")
      next
    end

    raise "Pagefind is not available on PATH. Set PAGEFIND_PYTHON or install `pagefind` for python3."
  end

  destination = File.expand_path(site.dest.to_s)
  default_language = site.config["default_lang"].to_s
  if !active_language.empty? && active_language != default_language && File.basename(destination) == active_language
    destination = File.dirname(destination)
  end
  Jekyll.logger.info("Pagefind", "indexing #{destination}")

  success = system(python, "-m", "pagefind", "--site", destination)
  unless success
    if development_build
      Jekyll.logger.warn("Pagefind", "skipping indexing in development because indexing failed for #{destination}")
      next
    end

    raise "Pagefind indexing failed for #{destination}"
  end
end
