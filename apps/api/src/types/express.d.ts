type Timings = {
  totalStart: number;
  authMs: number;
  permissionMs: number;
  serializationMs: number;
};

declare global {
  namespace Express {
    interface Request {
      _timings?: Timings;
      _requestId?: string;
    }
  }
}

export {};
