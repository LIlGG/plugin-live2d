/// <reference types="@rsbuild/core/types" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.css?inline" {
  const content: string;
  export default content;
}
