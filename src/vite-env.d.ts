/// <reference types="vite/client" />

declare module "pdfjs-dist/build/pdf.worker.min.mjs?url" {
  const src: string;
  export default src;
}

// Shared Remotion primitive/brand data lives in server/*.mjs (single source of
// truth, also imported by the browser). Declare the shapes so tsc doesn't need
// to read the .mjs files directly.
declare module "*/primitives.mjs" {
  export const PRIMITIVES: {
    name: string;
    from: string;
    default?: boolean;
    nodeImport?: string;
    brand?: boolean;
  }[];
  export const PRIMITIVE_NAMES: string[];
}

declare module "*/brand.mjs" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const BRAND: any;
}
