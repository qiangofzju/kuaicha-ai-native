export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ErrorResponse {
  detail: string;
  status_code: number;
}
