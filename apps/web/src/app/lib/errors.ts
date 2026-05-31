import { AxiosError } from 'axios';

// Extrai uma mensagem legível de erros de API (axios) ou Error comuns.
export function getErrorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  const apiMessage = (error as AxiosError<{ message?: string | string[] }>)?.response?.data?.message;
  if (Array.isArray(apiMessage)) return apiMessage.join(', ');
  if (typeof apiMessage === 'string' && apiMessage) return apiMessage;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
