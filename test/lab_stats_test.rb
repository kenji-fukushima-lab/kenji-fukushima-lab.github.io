# frozen_string_literal: true

require 'minitest/autorun'
require 'ostruct'

require_relative '../_plugins/lab-stats'

class LabStatsGeneratorTest < Minitest::Test
  def setup
    @generator = LabStats::Generator.new
  end

  def test_count_active_members_excludes_template_profile
    profiles = OpenStruct.new(
      docs: [
        build_profile('_profiles/current_members/kenji_fukushima.md', 'Kenji Fukushima', 'professor'),
        build_profile('_profiles/current_members/jiawei_li.md', 'Jiawei Li', 'student'),
        build_profile('_profiles/template/template.md', 'Your Name', 'future'),
        build_profile('_profiles/alumni/former_member.md', 'Former Member', 'alumni')
      ]
    )
    site = OpenStruct.new(collections: { 'profiles' => profiles })

    assert_equal 2, @generator.send(:count_active_members, site)
  end

  private

  def build_profile(relative_path, name, position_key)
    OpenStruct.new(
      relative_path: relative_path,
      data: {
        'name' => name,
        'position_key' => position_key
      }
    )
  end
end
