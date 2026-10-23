# frozen_string_literal: true

# ruby tests/benchmarks/post-navigation.rb REFERENCE_SHA
# Real native posts, includes and translations; includes index generation cost.
require 'jekyll'
require 'json'
require 'yaml'
require 'date'
require 'tmpdir'
require 'digest'
require 'open3'
require File.join(Dir.pwd, '_plugins/generated_site_indexes')
root=Dir.pwd
reference_sha=ARGV.fetch(0)
reference,status=Open3.capture2e('git','show',"#{reference_sha}:_includes/post_navigation.liquid")
abort reference unless status.success?
current=File.read(File.join(root,'_includes/post_navigation.liquid'))
templates={'reference'=>Liquid::Template.parse(reference),'current'=>Liquid::Template.parse(current)}
Dir.mktmpdir do |temporary|
  config=YAML.safe_load_file('_config.yml',permitted_classes:[Date,Time],aliases:true)
  config.merge!('source'=>root,'destination'=>File.join(temporary,'site'),'cache_dir'=>File.join(temporary,'cache'),'plugins'=>[],'plugins_dir'=>[],'quiet'=>true)
  site=Jekyll::Site.new(Jekyll.configuration(config))
  site.read
  builder=GeneratedSiteIndexes::Builder.new(site)
  posts=builder.posts_by_lang_for_liquid
  site.data['generated_posts_by_lang']=posts
  workload=posts.flat_map{|lang,entries|entries.map{|post|[lang,post['url']]}}
  # Include a missing URL in both languages; it must remain navigation-free.
  workload += [['en-us','/missing/'],['ja','/ja/missing/']]
  render=lambda do |variant|
    template=templates.fetch(variant)
    if variant=='current'
      site.data['generated_post_indexes_by_lang']=builder.post_indexes_by_lang_for_liquid
    else
      site.data.delete('generated_post_indexes_by_lang')
    end
    workload.map do |lang,url|
      site.config['active_lang']=lang
      relative=lang==site.config['default_lang'] ? url : url.delete_prefix('/'+lang)
      context=Liquid::Context.new({'site'=>site.site_payload['site'],'page'=>{'url'=>relative}}, {}, {site:site})
      template.render!(context).gsub(/>\s+</,'><').strip
    end
  end
  expected=render.call('reference')
  raise 'navigation differs' unless expected==render.call('current')
  Integer(ENV.fetch('WARMUPS','3')).times{templates.each_key{|variant|render.call(variant)}}
  measurements={'reference'=>[],'current'=>[]}
  Integer(ENV.fetch('RUNS','11')).times do |i|
    order=i.even? ? templates.to_a : templates.to_a.reverse
    order.each do |variant,template|
      GC.start
      before=GC.stat(:total_allocated_objects)
      wall=Process.clock_gettime(Process::CLOCK_MONOTONIC)
      cpu=Process.clock_gettime(Process::CLOCK_PROCESS_CPUTIME_ID)
      actual=render.call(variant)
      sample={wall_ms:(Process.clock_gettime(Process::CLOCK_MONOTONIC)-wall)*1000,cpu_ms:(Process.clock_gettime(Process::CLOCK_PROCESS_CPUTIME_ID)-cpu)*1000,allocated:GC.stat(:total_allocated_objects)-before}
      raise 'navigation changed' unless actual==expected
      measurements[variant]<<sample
    end
  end
  medians=measurements.transform_values{|samples|samples.first.keys.to_h{|key|[key,samples.map{|s|s[key]}.sort[samples.length/2]]}}
  puts JSON.pretty_generate(reference:reference_sha,ruby:RUBY_DESCRIPTION,posts:posts.transform_values(&:length),workload:workload.length,sha256:Digest::SHA256.hexdigest(JSON.generate(expected)),medians:medians,samples:measurements)
end
