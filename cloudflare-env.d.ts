declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    IMAGES?: ImagesBinding;
    SITE_ORIGIN?: string;
    AUTH_PEPPER?: string;
  }
}
