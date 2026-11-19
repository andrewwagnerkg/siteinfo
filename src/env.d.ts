interface ImportMetaEnv {
  /** Contact form endpoint, see src/config/site.ts. */
  readonly PUBLIC_FORM_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
