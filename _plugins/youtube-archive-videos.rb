require 'httparty'
require 'jekyll'
require 'time'

module Outreach
  class YoutubeArchiveVideosGenerator < Jekyll::Generator
    safe true
    priority :high

    ARCHIVE_URL = 'https://www.youtube.com/@Iden-chan/search?query=%E7%A6%8F%E5%B3%B6%E5%81%A5%E5%85%90'.freeze
    FALLBACK_VIDEO_IDS = %w[hyylpSDmgLE cZwnYDsSWvc DqrEY-nCh30].freeze
    MAX_VIDEO_COUNT = 3

    def generate(site)
      site.data['outreach'] ||= {}
      site.data['outreach']['radio_archive_url'] = ARCHIVE_URL

      video_ids = fetch_archive_video_ids
      if video_ids.empty?
        Jekyll.logger.warn('YouTube archive fetch:', 'no videos detected; using fallback IDs')
        video_ids = FALLBACK_VIDEO_IDS
      end

      site.data['outreach']['radio_archive_latest_video_ids'] = video_ids.first(MAX_VIDEO_COUNT)
      site.data['outreach']['radio_archive_last_checked_at'] = Time.now.utc.iso8601
      Jekyll.logger.info('YouTube archive fetch:', "loaded #{site.data['outreach']['radio_archive_latest_video_ids'].size} videos")
    rescue StandardError => e
      Jekyll.logger.warn('YouTube archive fetch failed:', e.message)
      site.data['outreach'] ||= {}
      site.data['outreach']['radio_archive_url'] = ARCHIVE_URL
      site.data['outreach']['radio_archive_latest_video_ids'] = FALLBACK_VIDEO_IDS
    end

    private

    def fetch_archive_video_ids
      response = HTTParty.get(
        ARCHIVE_URL,
        headers: { 'User-Agent' => "Ruby/#{RUBY_VERSION}" },
        timeout: 20
      )
      return [] unless response.success?

      response
        .body
        .to_s
        .scan(/"videoRenderer":\{"videoId":"([A-Za-z0-9_-]{11})"/)
        .flatten
        .uniq
        .first(MAX_VIDEO_COUNT)
    end
  end
end
