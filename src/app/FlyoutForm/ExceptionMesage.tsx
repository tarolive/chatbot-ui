interface Violation {
  field: string;
  message: string;
}

export interface ErrorResponse {
  violations?: Violation[];
}