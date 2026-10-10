import "express-session";

declare module "express-session" {
  interface SessionData {
    staffId?: number;
    csrfToken?: string;
  }
}