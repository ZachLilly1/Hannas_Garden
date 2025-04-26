declare module 'csurf' {
  import { RequestHandler } from 'express';
  
  interface CsrfOptions {
    cookie?: boolean | Object;
    ignoreMethods?: string[];
    sessionKey?: string;
    value?: (req: any) => string;
  }
  
  function csrf(options?: CsrfOptions): RequestHandler;
  
  export = csrf;
}