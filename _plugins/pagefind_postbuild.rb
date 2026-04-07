# frozen_string_literal: true

# Generate Pagefind assets automatically after Jekyll writes the site so
# plain `jekyll build` / `jekyll serve` outputs always contain the search bundle.
Jekyll::Hooks.register :site, :post_write do |site|
  next unless site.config["search_enabled"]

  python_candidates = [
    ENV["PAGEFIND_PYTHON"],
    "python3",
    "/usr/bin/python3",
    "python",
  ].compact.uniq

  python = python_candidates.find do |candidate|
    system(candidate, "-m", "pagefind", "--version", out: File::NULL, err: File::NULL)
  end

  raise "Pagefind is not available on PATH. Set PAGEFIND_PYTHON or install `pagefind` for python3." unless python

  destination = site.config["destination"].to_s
  Jekyll.logger.info("Pagefind", "indexing #{destination}")

  success = system(python, "-m", "pagefind", "--site", destination)
  raise "Pagefind indexing failed for #{destination}" unless success
end
