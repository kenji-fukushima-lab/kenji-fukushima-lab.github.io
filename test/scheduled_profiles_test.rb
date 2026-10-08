# frozen_string_literal: true

require 'fileutils'
require 'jekyll'
require 'minitest/autorun'
require 'time'
require 'tmpdir'
require_relative '../_plugins/scheduled_profiles'
require_relative '../_plugins/lab-stats'
require_relative '../_plugins/coauthor-network'

class ScheduledProfilesTest < Minitest::Test
  def test_tokyo_date_boundary_filters_all_consumers_and_catches_up_later
    Dir.mktmpdir('scheduled-profiles') do |directory|
      path = profile(directory, 'new-member', "publish_on: 2026-10-08\nregistration_issue: 23\nregistration_approved_by: kfuku52\n")
      original = File.read(path)
      profile(directory, 'existing')
      before = read_at(directory, '2026-10-07T14:59:59Z')
      assert_equal ['existing'], before.collections['profiles'].docs.map { |document| document.data['name'] }
      assert_equal 1, LabStats::Generator.new.send(:count_active_members, before)
      refute CoauthorNetwork::Generator.new.send(:build_profile_lookup, before).values.any? { |entry| entry['name'] == 'new-member' }
      due = read_at(directory, '2026-10-07T15:00:00Z')
      assert_equal 2, due.collections['profiles'].docs.length
      assert_equal 2, LabStats::Generator.new.send(:count_active_members, due)
      assert CoauthorNetwork::Generator.new.send(:build_profile_lookup, due).values.any? { |entry| entry['name'] == 'new-member' }
      assert_equal 2, read_at(directory, '2026-11-01T00:00:00Z').collections['profiles'].docs.length
      assert_equal original, File.read(path)
      before.reset
      before.read
      assert_equal 1, before.collections['profiles'].docs.length
    end
  end

  def test_unapproved_draft_and_unpublished_scheduled_profiles_never_appear
    Dir.mktmpdir('unapproved-profiles') do |directory|
      profile(directory, 'missing-approval', "publish_on: '2026-10-01'\nregistration_issue: 23\n")
      profile(directory, 'wrong-approver', "publish_on: '2026-10-01'\nregistration_issue: 24\nregistration_approved_by: someone-else\n")
      profile(directory, 'draft', "publish_on: '2026-10-01'\ndraft: true\n")
      profile(directory, 'unpublished', "publish_on: '2026-10-01'\npublished: false\n")
      assert_empty read_at(directory, '2026-11-01T00:00:00Z').collections['profiles'].docs
    end
  end

  def test_existing_manual_and_alumni_records_keep_their_previous_behavior
    Dir.mktmpdir('legacy-profiles') do |directory|
      profile(directory, 'manual')
      profile(directory, 'legacy', "published: false\n")
      profile(directory, 'scheduled-manual', "publish_on: '2026-10-01'\n")
      names = read_at(directory, '2026-11-01T00:00:00Z').collections['profiles'].docs.map { |document| document.data['name'] }
      assert_equal %w[manual scheduled-manual], names.sort
    end
  end

  def test_invalid_or_missing_publication_dates_fail_the_build
    ["publish_on: '2026-02-30'\n", "publish_on: '2026-2-01'\n", "publish_on: 'tomorrow'\n", "registration_issue: 23\nregistration_approved_by: kfuku52\n"].each do |fields|
      Dir.mktmpdir('invalid-profile-date') do |directory|
        profile(directory, 'invalid', fields)
        error = assert_raises(Jekyll::Errors::FatalException) { read_at(directory, '2026-11-01T00:00:00Z') }
        assert_includes error.message, 'Invalid profile publish_on date'
      end
    end
  end

  def test_future_and_unapproved_profiles_are_absent_from_rendered_pages_and_documents
    Dir.mktmpdir('rendered-profiles') do |directory|
      profile(directory, 'visible-member', "publish_on: '2026-10-01'\nregistration_issue: 23\nregistration_approved_by: kfuku52\nregistration_approval_comment: 45\n")
      profile(directory, 'future-member', "publish_on: '2099-01-01'\nregistration_issue: 24\nregistration_approved_by: kfuku52\nregistration_approval_comment: 46\n")
      profile(directory, 'unapproved-member', "publish_on: '2026-10-01'\nregistration_issue: 25\n")
      ['', 'ja/'].each do |prefix|
        page = File.join(directory, prefix, 'index.html')
        FileUtils.mkdir_p(File.dirname(page))
        File.write(page, "---\nlayout: null\n---\n<ul>{% for profile in site.profiles %}<li>{{ profile.name }}</li>{% endfor %}</ul>")
      end
      site = read_at(directory, '2026-11-01T00:00:00Z', output: true)
      site.render
      site.write
      ['index.html', 'ja/index.html'].each do |page|
        html = File.read(File.join(site.dest, page))
        assert_includes html, 'visible-member'
        refute_includes html, 'future-member'
        refute_includes html, 'unapproved-member'
      end
      output = Dir.glob(File.join(site.dest, '**', '*')).select { |path| File.file?(path) }
      assert output.any? { |path| path.include?('visible-member') }
      refute output.any? { |path| path.include?('future-member') || path.include?('unapproved-member') }
    end
  end

  private

  def profile(directory, name, fields = '')
    path = File.join(directory, '_profiles/current_members', "#{name}.md")
    FileUtils.mkdir_p(File.dirname(path))
    File.write(path, "---\nname: #{name}\nposition_key: postdoc\n#{fields}---\n")
    path
  end

  def read_at(directory, time, output: false)
    site = Jekyll::Site.new(Jekyll.configuration(
      'source' => directory, 'destination' => File.join(directory, '_site'), 'plugins_dir' => [], 'plugins' => [],
      'collections' => { 'profiles' => { 'output' => output } }, 'timezone' => 'Asia/Tokyo', 'time' => Time.iso8601(time)
    ))
    site.read
    site
  end
end
