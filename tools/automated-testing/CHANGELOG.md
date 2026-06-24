# Changelog

## [2.0.0] - 2026-01-07

### Fixed
- **URL Configuration Bug**: Fixed critical bug where preset configurations were overriding the user-specified `--url` parameter
  - Previously: `Object.assign(config, presetConfig)` was overwriting the baseUrl after it was set
  - Now: Preset is applied first, then URL is set, ensuring user's URL always takes precedence
  - **Impact**: Tests can now correctly connect to any URL specified by the user

### Changed
- **CLI Command**: Updated from `npx ts-node` to `npx tsx` for better ES module support
  - Old: `npx ts-node src/tools/automated-testing/cli.ts`
  - New: `npx tsx tools/automated-testing/cli.ts`
  - **Why**: tsx has better ESM support and handles TypeScript files more reliably

- **File Path**: Updated all documentation to reflect correct file path
  - Old: `src/tools/automated-testing/`
  - New: `tools/automated-testing/`

### Improved
- **README.md**: Completely overhauled with:
  - Clear prerequisites section
  - Step-by-step quick start guide
  - Comprehensive CLI options reference
  - Common troubleshooting solutions
  - Updated all code examples
  - Added Windows-specific commands
  - Better structured examples

- **Error Handling**: Added better error messages when:
  - Dev server is not running
  - Wrong URL is provided
  - Playwright browsers not installed

### Troubleshooting Added
- EBUSY errors (node processes locking files)
- Missing Playwright browsers
- Connection refused errors
- Wrong port/URL issues
- Module resolution errors

## [1.0.0] - 2025-12-22

### Added
- Initial release
- Dynamic page discovery and crawling
- Form, button, and link testing
- Accessibility testing (WCAG)
- Performance testing (Core Web Vitals)
- Edge function testing
- Console and network monitoring
- Multi-format reporting (HTML, JSON, Markdown)
- Test presets (smoke, standard, full, mobile, accessibility, performance, api, ci)
- Parallel execution
- Visual regression testing
- Authentication testing
