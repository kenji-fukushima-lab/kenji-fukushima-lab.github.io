# frozen_string_literal: true

require 'date'
require 'jekyll'

module ScheduledProfiles
  module_function

  def visible?(profile, now)
    data = profile.data
    registration = data.key?('registration_issue') || data.key?('registration_approved_by')
    return true unless registration || data.key?('publish_on')

    value = data['publish_on'].to_s
    begin
      raise ArgumentError unless value.match?(/\A\d{4}-\d{2}-\d{2}\z/)

      date = Date.iso8601(value)
    rescue ArgumentError
      raise Jekyll::Errors::FatalException, "Invalid profile publish_on date: #{profile.relative_path} (#{value.inspect})"
    end
    return false if data['published'] == false || data['draft'] == true
    return false if registration && data['registration_approved_by'] != 'kfuku52'

    now >= Time.new(date.year, date.month, date.day, 0, 0, 0, '+09:00')
  end

  def filter(site)
    collection = site.collections['profiles']
    return unless collection

    # Remove unavailable profiles before language coordination and all generators,
    # so people lists, homepage statistics, coauthor metadata and search agree.
    collection.docs.select! { |profile| visible?(profile, site.time || Time.now) }
  end
end

Jekyll::Hooks.register :site, :post_read, :priority => 40 do |site|
  ScheduledProfiles.filter(site)
end
