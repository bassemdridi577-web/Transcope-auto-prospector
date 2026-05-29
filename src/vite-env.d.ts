/// <reference types="vite/client" />

declare module '@tailwindcss/vite' {
  import { Plugin } from 'vite';
  export default function tailwindcss(): Plugin;
}

declare module '@vitejs/plugin-react' {
  import { Plugin } from 'vite';
  interface Options {
    include?: string | RegExp | (string | RegExp)[];
    exclude?: string | RegExp | (string | RegExp)[];
    babel?: any;
    jsxImportSource?: string;
    jsxRuntime?: 'automatic' | 'classic';
  }
  export default function react(options?: Options): Plugin[];
}
