const path = require('node:path');

// The Next.js and shared studio styles use Tailwind v3 directives.
// Resolve the studio workspace's existing v3 dependency; the separate
// Vite application uses Tailwind v4 and retains its own configuration.
module.exports = {
  plugins: {
    [require.resolve('tailwindcss', {
      paths: [path.join(__dirname, 'packages/studio')],
    })]: { config: path.join(__dirname, 'tailwind.config.js') },
    autoprefixer: {},
  },
};
