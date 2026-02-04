# Upstream Synchronization History

This document tracks synchronization with the upstream multi-language-al-folio repository.

## 2026-02-04: Phase 1 - Dependencies and Critical Fixes

### Status
✅ **Completed** - All Phase 1 updates applied successfully

### Branch
- Development branch: `feature/upstream-sync-2024-2026`
- Backup branch: `backup/pre-upstream-sync`

### Upstream Information
- Repository: https://github.com/george-gca/multi-language-al-folio
- Last sync before this: January 19, 2024
- Upstream commits since then: 758 commits
- Upstream versions analyzed: v1.11.0 through v1.16.2

### Dependency Updates

| Package | Previous Version | Updated Version | Notes |
|---------|-----------------|-----------------|-------|
| Jekyll | 4.3.4 | 4.4.1 | Security and stability improvements |
| jekyll-polyglot | 1.8.1 | 1.12.0 | Multi-language support enhancements |
| jekyll-scholar | 7.1.3 | 7.3.0 | Bibliography plugin improvements |
| csl | 1.6.0 | 2.2.1 | Citation style language updates |
| csl-styles | 1.0.1.11 | 2.0.2 | Citation styles database |
| citeproc-ruby | 1.1.14 | 2.1.8 | Citation processing |
| jekyll-minifier | 0.1.10 | 0.2.0 | Asset minification |
| feedjira | 3.2.4 | 4.0.1 | RSS/Atom feed parser |
| httparty | 0.22.0 | 0.24.2 | HTTP client library |
| terser | 1.2.4 | 1.2.6 | JavaScript minifier |
| css_parser | 1.21.0 | 1.21.1 | CSS parser |
| ostruct | 0.6.1 | 0.6.3 | Ruby stdlib component |
| jekyll-terser | 0.2.2 | 0.2.3 | Jekyll terser integration |

### Cherry-Picked Bug Fixes

1. **f521c0ae** - Fix bibliography month persisting to subsequent entries (#3391)
   - **Issue**: Liquid variables persisted across iterations, causing months from previous entries to appear on entries without months
   - **Fix**: Reinitialized date variables per entry
   - **Impact**: Publications page now correctly displays dates
   - **File**: `_layouts/bib.liquid`

2. **6023fd80** - Fix bib/code layout bug (#3387)
   - **Issue**: Layout issue with bibliography and code blocks
   - **Fix**: CSS adjustment for proper rendering
   - **Impact**: Improved layout consistency
   - **File**: `_sass/_base.scss`

3. **fa93875e** - Fix MathJax long-formula overflow on mobile screens (#3302)
   - **Issue**: Long mathematical formulas overflowed horizontally on mobile devices
   - **Fix**: Added horizontal scrolling for MathJax containers
   - **Impact**: Better mobile responsiveness for mathematical content
   - **File**: `_sass/_base.scss` (added `mjx-container[jax="CHTML"][display="true"] { overflow-x: auto; }`)

4. **8086c57b** - Fix code flow overflow and responsive design (#3229)
   - **Issue**: Code blocks overflowed on smaller screens
   - **Fix**: Responsive design improvements
   - **Impact**: Better code display on all screen sizes
   - **File**: `_sass/_base.scss`

### Testing Results

#### Build Test
- ✅ Build successful (6.5 seconds)
- ✅ No critical errors
- ⚠️ Minor deprecation warnings (Sass @import, Rails timezone) - non-breaking

#### Functional Tests
- ✅ **Profiles System**: All 12 lab members render correctly with position hierarchy
- ✅ **Publications Page**: Bibliography renders with custom badges (212KB page size, 248 badge occurrences)
- ✅ **Navigation**:
  - English menu correctly excludes Blog and Outreach (nav: false)
  - Japanese menu correctly includes Blog (ブログ) and Outreach (アウトリーチ) (nav: true)
- ✅ **Multi-language**: Both en-us and ja versions build successfully
- ✅ **Search**: Icon-only display preserved (no ⌘k text)
- ✅ **Custom Plugins**: google-scholar-citations.rb, inspirehep-citations.rb working

### Custom Features Preserved

All customizations documented in the plan remain intact:
1. Custom profiles collection with 18 position types
2. Custom citation fetcher plugins
3. Bilingual navigation (different menus for EN/JA)
4. Article type badges (Original, Preprint)
5. Feature article/press release buttons in bibliography
6. Search icon customization (removed keyboard shortcut display)
7. Lab-specific configuration (max_width: 950px, scholar settings, etc.)

### Commits Excluded from Phase 1

The following upstream changes were **intentionally skipped** for Phase 1:

1. **Plugin Migrations**:
   - Migration from `jekyll-archives` to `jekyll-archives-v2` (breaking change)
   - Addition of `jekyll-3rd-party-libraries` plugin
   - Addition of `jekyll-cache-bust` plugin
   - Addition of `jekyll-socials` plugin

2. **New Features**:
   - GitHub Copilot agents (.github/agents/*.agent.md) - removed in upstream
   - AI-powered documentation features
   - New figure.cover styles for media tracking
   - Workflow enhancements

3. **Documentation Updates**:
   - README improvements
   - FAQ updates
   - CUSTOMIZE.md changes

**Rationale**: Phase 1 focused on security, stability, and critical bug fixes without risking breaking changes to custom features. These excluded items require more careful integration and testing.

---

## Phase 2 (Planned for Future)

### Objectives
- Evaluate and potentially migrate to new plugins (jekyll-archives-v2, etc.)
- Adopt new features that benefit the lab website
- Update workflows and documentation
- Further upstream alignment where beneficial

### Considerations for Phase 2
1. **jekyll-archives → jekyll-archives-v2 migration**: Assess compatibility with current archive structure
2. **New plugins evaluation**: Determine if jekyll-socials, jekyll-3rd-party-libraries, jekyll-cache-bust provide value
3. **Workflow updates**: Review GitHub Actions improvements
4. **Feature adoption**: Selectively adopt new upstream features that don't conflict with customizations

### Timeline
- Phase 2 should be scheduled after Phase 1 has been thoroughly tested in production
- Recommended: 3-6 months after Phase 1 deployment to allow for stability assessment

---

## Lessons Learned

### What Worked Well
1. **Phased approach**: Separating critical updates from feature additions reduced risk
2. **Conservative bundle update**: Using `--conservative` flag maintained compatibility
3. **Cherry-picking bug fixes**: Allowed selective integration of improvements
4. **Comprehensive testing**: Functional tests caught potential issues early
5. **Backup branch**: Provided safety net for quick rollback if needed

### Challenges
1. **Large upstream divergence**: 758 commits made full merge impractical
2. **Merge conflicts**: Some cherry-picks required manual conflict resolution (e.g., _sass/_base.scss)
3. **Plugin ecosystem changes**: Upstream moved to different plugins, requiring careful evaluation

### Recommendations for Future Syncs
1. **More frequent syncs**: Consider quarterly reviews to prevent large divergences
2. **Automated dependency updates**: Use Dependabot or similar for security patches
3. **Test branch deployment**: Deploy to staging environment before production
4. **Document all customizations**: Maintain CUSTOMIZATIONS.md to track divergences
5. **Monitor upstream**: Subscribe to upstream repository releases and security advisories

---

## Next Steps

### Immediate (Post Phase 1)
1. ✅ Push `feature/upstream-sync-2024-2026` branch to remote
2. ⏳ Deploy to staging/test environment (if available)
3. ⏳ Monitor for issues in test environment
4. ⏳ Merge to main after successful testing
5. ⏳ Push local main commits to remote (includes navigation changes, search icon fix)
6. ⏳ Monitor production for 1-2 weeks

### Short-term (1-3 months)
1. Create CUSTOMIZATIONS.md documenting all fork-specific modifications
2. Evaluate Phase 2 scope and priority
3. Plan Phase 2 implementation timeline

### Long-term (3-12 months)
1. Implement Phase 2 updates
2. Establish regular sync schedule (quarterly or bi-annual)
3. Consider contributing useful custom features back to upstream

---

## Contact & Maintenance

**Primary Maintainer**: Fukushima Lab Team
**Upstream Repository**: https://github.com/george-gca/multi-language-al-folio
**Sync Plan Document**: `/home/vscode/.claude/plans/rippling-tinkering-melody.md`

For questions about customizations or sync strategy, refer to the comprehensive plan document.

---

*Document created: 2026-02-04*
*Last updated: 2026-02-04*
