export interface ErrorObject {
  title: string;
  body?: string;
  violations?: Violation[];
}

export interface Violation {
  message: string;
  field: string;
}