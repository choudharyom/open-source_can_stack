module.exports = {
    content: [
      './src/pages/**/*.{js,ts,jsx,tsx}',
      './src/components/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
      extend: {
        colors: {
          blue: {
            50: '#f0f7ff',
            100: '#e0effe',
            200: '#bae1fd',
            300: '#7cc5fb',
            400: '#47a8f9',
            500: '#2186f0',
            600: '#1063e6',
            700: '#0d4fcb',
            800: '#0d3fa3',
            900: '#0f3980',
          },
          gray: { // Add default gray palette
            50: '#f9fafb',
            100: '#f3f4f6',
            200: '#e5e7eb',
            300: '#d1d5db',
            400: '#9ca3af',
            500: '#6b7280',
            600: '#4b5563',
            700: '#374151',
            800: '#1f2937',
            900: '#111827',
            950: '#030712'
          },
        },
        boxShadow: {
          card: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        },
        spacing: {
          '72': '18rem',
          '84': '21rem',
          '96': '24rem',
        },
        height: {
          '128': '32rem',
        },
      },
    },
    plugins: [
      require('@tailwindcss/forms'),
    ],
  };
