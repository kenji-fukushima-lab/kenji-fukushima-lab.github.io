# GitHub Actions Workflows Guide

This document explains how to use the automated workflows configured for this repository.

## Overview

The repository uses several GitHub Actions workflows to maintain code quality, accessibility, and security:

1. **Axe Accessibility Testing** - Automated accessibility compliance checks
2. **Prettier Formatting** - Code formatting consistency checks on pull requests
3. **CodeQL Security Scanning** - Static analysis for security vulnerabilities

---

## Axe Accessibility Testing

**File**: `.github/workflows/axe.yml`

**When it runs**:

- On every push to `main` or `master` branches
- On every pull request to `main` or `master` branches
- Manually via workflow_dispatch

**What it does**:
Runs axe-core accessibility tests against the deployed website to ensure WCAG 2.1 compliance.

### How to interpret results

1. **View results**: Go to Actions tab → Select "Accessibility Testing" workflow → Click on the latest run
2. **Check for violations**: The workflow will fail if accessibility issues are found
3. **Review details**: Click on the failed step to see specific violations

### Common violations and fixes

| Violation        | Description                    | Fix                                                                   |
| ---------------- | ------------------------------ | --------------------------------------------------------------------- |
| `color-contrast` | Text contrast too low          | Adjust text/background colors to meet WCAG AA standards (4.5:1 ratio) |
| `image-alt`      | Images missing alt text        | Add descriptive `alt` attributes to all `<img>` tags                  |
| `label`          | Form inputs missing labels     | Add `<label>` elements or `aria-label` attributes                     |
| `link-name`      | Links missing accessible names | Ensure links have descriptive text (not just icons)                   |
| `heading-order`  | Heading levels skipped         | Use proper heading hierarchy (h1 → h2 → h3, don't skip levels)        |

### Manual testing

To run accessibility tests locally:

```bash
# Install axe-core CLI
npm install -g @axe-core/cli

# Build the site
bundle exec jekyll build

# Serve the site
bundle exec jekyll serve

# In another terminal, run axe
axe http://localhost:4000
```

### Temporarily disabling

If you need to disable accessibility checks temporarily (not recommended):

1. Edit `.github/workflows/axe.yml`
2. Comment out lines 5-12 (the `on:` triggers)
3. Commit and push

**Important**: Always re-enable before merging to main!

---

## Prettier Formatting

**File**: `.github/workflows/prettier.yml`

**When it runs**:

- On every pull request
- Comments on the PR if formatting issues are found

**What it does**:
Checks code formatting consistency using Prettier and posts a comment on the PR if fixes are needed.

### How to fix formatting issues

#### Option 1: Auto-fix with Prettier (Recommended)

```bash
# Install Prettier
npm install

# Check formatting
npm run prettier

# Auto-fix all files
npm run prettier:fix
```

#### Option 2: Manual fixes

Review the PR comment for specific files and lines that need formatting changes. Common issues:

- **Indentation**: Use 2 spaces for HTML/Liquid, as configured
- **Line length**: Keep lines under configured max length
- **Trailing spaces**: Remove whitespace at end of lines
- **Final newline**: Ensure files end with a newline

### Prettier configuration

Settings are in `.prettierrc`:

```json
{
  "overrides": [
    {
      "files": ["*.html", "*.liquid"],
      "options": {
        "tabWidth": 2
      }
    }
  ]
}
```

### Ignoring files

To exclude files from Prettier checking, add them to `.prettierignore`:

```
_site/
.jekyll-cache/
node_modules/
vendor/
```

---

## CodeQL Security Scanning

**File**: `.github/workflows/codeql.yml`

**When it runs**:

- On every push to `main` or `master`
- On every pull request
- On a schedule (weekly)
- Manually via workflow_dispatch

**What it does**:
Analyzes code for security vulnerabilities using GitHub's CodeQL engine. Scans JavaScript and Ruby code.

### How to review alerts

1. **View alerts**: Go to Security tab → Code scanning alerts
2. **Filter by severity**: Critical, High, Medium, Low
3. **Review details**: Click on an alert to see:
   - Description of the vulnerability
   - Affected code location
   - Recommended fix
   - Example code snippets

### Common security issues

| Alert Type                     | Description                              | Fix                                                       |
| ------------------------------ | ---------------------------------------- | --------------------------------------------------------- |
| **Cross-site scripting (XSS)** | User input rendered without sanitization | Use Liquid's `escape` filter or `{{ var \| escape }}`     |
| **Path traversal**             | File paths constructed from user input   | Validate and sanitize file paths, use allowlists          |
| **SQL injection**              | SQL queries with unsanitized input       | Use parameterized queries (not applicable for Jekyll)     |
| **Command injection**          | Shell commands with user input           | Avoid `system()` calls with user input, validate strictly |
| **Sensitive data exposure**    | API keys or credentials in code          | Move to environment variables, never commit secrets       |

### Dismissing false positives

If an alert is a false positive:

1. Go to Security → Code scanning alerts
2. Click on the alert
3. Click "Dismiss alert" → Select reason (e.g., "Used in tests")
4. Add a comment explaining why it's safe

### Testing locally

To run CodeQL locally (advanced):

```bash
# Install CodeQL CLI
# See: https://github.com/github/codeql-cli-binaries/releases

# Create database
codeql database create codeql-db --language=javascript,ruby

# Run analysis
codeql database analyze codeql-db --format=sarif-latest --output=results.sarif

# View results
cat results.sarif | jq '.runs[0].results'
```

---

## Additional Workflows

### Broken Links Checker

**File**: `.github/workflows/broken-links-site.yml`

Runs after deployment to check for broken links on the live site. Review results in Actions tab.

### Lighthouse Performance

**File**: `.github/workflows/lighthouse-badger.yml`

Generates performance, accessibility, and SEO badges using Lighthouse. Results are committed to the repository automatically.

---

## Troubleshooting

### Workflow not running

1. Check `.github/workflows/*.yml` files for syntax errors
2. Verify branch name matches triggers (main/master)
3. Check repository Settings → Actions → "Allow all actions"

### Workflow failing unexpectedly

1. Check Actions tab for error messages
2. Review recent changes to workflow files
3. Check for upstream changes in actions (e.g., `actions/checkout@v4`)

### Need to re-run workflow

1. Go to Actions tab
2. Click on the workflow run
3. Click "Re-run jobs" → "Re-run all jobs"

---

## Best Practices

1. **Before creating a PR**:
   - Run `npm run prettier:fix` to format code
   - Build locally to catch errors: `bundle exec jekyll build`
   - Test major features manually

2. **When PR checks fail**:
   - Read the error messages carefully
   - Fix issues locally and push updates
   - Don't merge until all checks pass (unless intentionally dismissing)

3. **For accessibility**:
   - Test with screen readers when adding new features
   - Maintain color contrast ratios (use tools like WebAIM contrast checker)
   - Provide text alternatives for all images and icons

4. **For security**:
   - Never commit API keys, passwords, or tokens
   - Review CodeQL alerts promptly (especially critical/high severity)
   - Update dependencies regularly to patch vulnerabilities

---

## References

- **Axe Core**: https://github.com/dequelabs/axe-core
- **Prettier**: https://prettier.io/docs/en/
- **CodeQL**: https://codeql.github.com/docs/
- **WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/
- **GitHub Actions**: https://docs.github.com/en/actions

---

_Last updated: 2026-02-04 (Phase 2A implementation)_
