// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxtjs/i18n'
  ],

  $development: {
    sourcemap: {
      server: true,
      client: true
    }
  },

  $production: {
    sourcemap: {
      server: false,
      client: false
    },
    nitro: {
      externals: {
        inline: [
          /^(?!.*(mysql2|@libsql[\\/+]client|(?:^|[\\/+])pg(?:@|[\\/]|$)))/
        ]
      },
      rollupConfig: {
        external: [
          'mysql2',
          'mysql2/promise',
          '@libsql/client',
          'pg'
        ]
      }
    }
  },

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  compatibilityDate: '2025-01-15',

  vite: {
    optimizeDeps: {
      include: [
        '@nuxt/ui > prosemirror-state',
        '@nuxt/ui > prosemirror-transform',
        '@nuxt/ui > prosemirror-model',
        '@nuxt/ui > prosemirror-view',
        '@nuxt/ui > prosemirror-gapcursor',
        '@tiptap/core',
        '@tiptap/vue-3',
        '@tiptap/starter-kit',
        '@tiptap/extension-image',
        '@tiptap/extension-text-align',
        '@tiptap/extension-text-style'
      ]
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  i18n: {
    defaultLocale: 'en-US',
    strategy: 'no_prefix',
    locales: [
      { code: 'en-US', language: 'en-US', file: 'en-US.json', name: 'English' },
      { code: 'zh-CN', language: 'zh-Hans', file: 'zh-CN.json', name: '中文（简体）' }
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root'
    },
    compilation: {
      strictMessage: false
    }
  }
})
