module.exports = {
  ci: {
    collect: {
      // Run on production build
      staticDistDir: './build',
      // Or use locally served version
      // startServerCommand: 'npm run preview',
      // url: ['http://localhost:4173/'],
      numberOfRuns: 3,
    },
    assert: {
      // 80/20 approach: Focus on critical metrics with reasonable thresholds
      preset: 'lighthouse:no-pwa',
      assertions: {
        // Performance thresholds
        'categories:performance': ['warn', {minScore: 0.85}],
        'first-contentful-paint': ['warn', {maxNumericValue: 2000}],
        'interactive': ['warn', {maxNumericValue: 4000}],
        
        // Accessibility thresholds (higher priority since you've worked on it)
        'categories:accessibility': ['error', {minScore: 0.90}],
        'aria-required-children': ['error'],
        'button-name': ['error'],
        'color-contrast': ['error'],
        'document-title': ['error'],
        'html-has-lang': ['error'],
        'image-alt': ['error'],
        
        // Best practices with reasonable thresholds
        'categories:best-practices': ['warn', {minScore: 0.85}],
        
        // SEO thresholds (with Schema.org already implemented)
        'categories:seo': ['warn', {minScore: 0.9}],
        
        // Skip PWA category for now (can be added later)
        'categories:pwa': 'off',
      },
    },
    upload: {
      // Just save reports locally for now
      target: 'filesystem',
      outputDir: './lighthouse-reports',
      reportFilenamePattern: '%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%',
    },
  },
};