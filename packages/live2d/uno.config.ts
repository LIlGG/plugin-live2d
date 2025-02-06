import { defineConfig, presetUno, transformerDirectives } from 'unocss';

export default defineConfig({
  content: {
    filesystem: ['src/**/*.{html,ts,js,tsx,jsx}'],
  },
  presets: [presetUno()],
  transformers: [transformerDirectives()],
  rules: [
    ['writing-vertical-rl', {
      "writing-mode": "vertical-rl"
    }]
  ]
});