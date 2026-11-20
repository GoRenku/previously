// Vite replaces `import.meta.env.DEV` at build time: true under `pnpm dev`, false in every build.
interface ImportMetaEnv {
  readonly DEV: boolean;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
