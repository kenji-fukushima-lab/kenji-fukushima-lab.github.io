# Runtime versions match CI. Keep all stages on Debian bookworm.
FROM ruby:3.3.5-slim-bookworm AS ruby
FROM node:22-bookworm-slim AS node
FROM python:3.13-slim-bookworm

COPY --from=ruby /usr/local/ /usr/local/
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules/ /usr/local/lib/node_modules/

ENV DEBIAN_FRONTEND=noninteractive \
    GEM_HOME=/usr/local/bundle \
    BUNDLE_FROZEN=true \
    BUNDLE_SILENCE_ROOT_WARNING=1 \
    PATH="/usr/local/bundle/bin:${PATH}" \
    EXECJS_RUNTIME=Node \
    PAGEFIND_PYTHON=/usr/local/bin/python3 \
    LANG=C.UTF-8 \
    JEKYLL_ENV=development

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl git imagemagick librsvg2-bin libyaml-0-2 libgmp10 zlib1g-dev && \
    rm -rf /var/lib/apt/lists/* && ldconfig && \
    ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm && \
    ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

COPY requirements-build.txt requirements-test.txt /tmp/
RUN python3 -m pip install --no-cache-dir --disable-pip-version-check \
    -r /tmp/requirements-build.txt -r /tmp/requirements-test.txt

WORKDIR /srv/jekyll
COPY Gemfile Gemfile.lock ./
RUN gem install --no-document bundler -v "$(sed -n '/BUNDLED WITH/{n;s/ //g;p;}' Gemfile.lock)" && \
    bundle install

COPY bin/ bin/
EXPOSE 8080 35729
CMD ["bash", "bin/entry_point.sh"]
