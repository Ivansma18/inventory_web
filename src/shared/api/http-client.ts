import axios from "axios";

import { env } from "../config/env.ts";
import { createNetworkApiError, normalizeHttpError } from "./api-error.ts";

export const HTTP_CLIENT_TIMEOUT_MS = 10_000;

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface HttpRequest<TBody = unknown> {
  path: string;
  method: HttpMethod;
  data?: TBody;
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

const axiosInstance = axios.create({
  baseURL: env.VITE_API_URL,
  withCredentials: true,
  timeout: HTTP_CLIENT_TIMEOUT_MS,
});

export const httpClient = {
  async request<TResponse, TBody = unknown>(request: HttpRequest<TBody>): Promise<TResponse> {
    try {
      const response = await axiosInstance.request<TResponse>({
        url: request.path,
        method: request.method,
        data: request.data,
        params: request.params,
        headers: request.headers,
        signal: request.signal,
      });

      return response.data;
    } catch (error: unknown) {
      if (!axios.isAxiosError(error)) {
        throw error;
      }

      if (error.response) {
        throw normalizeHttpError(error.response.status, error.response.data);
      }

      throw createNetworkApiError();
    }
  },
};
