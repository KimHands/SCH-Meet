/**
 * API 에러 → 사용자에게 보여줄 한국어 메시지
 */

const HANGUL = /[가-힣]/;

const MESSAGE_BY_STATUS = {
  0: '네트워크 연결을 확인해주세요.',
  400: '입력값을 확인해주세요.',
  401: '로그인이 필요해요. 다시 로그인해주세요.',
  403: '권한이 없어요.',
  404: '요청한 정보를 찾을 수 없어요.',
  409: '이미 처리되었거나 다른 요청과 충돌했어요. 새로고침 후 다시 시도해주세요.',
  429: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.',
};
const SERVER_ERROR_MESSAGE = '서버 오류가 발생했어요. 잠시 후 다시 시도해주세요.';
const DEFAULT_MESSAGE = '요청을 처리하지 못했어요. 다시 시도해주세요.';

export class ApiError extends Error {
  constructor(message, status, detail = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

function extractDetail(body) {
  const detail = body?.detail ?? body?.message;
  if (Array.isArray(detail)) return typeof detail[0] === 'string' ? detail[0] : null;
  return typeof detail === 'string' ? detail : null;
}

function fallbackMessage(status) {
  if (status >= 500) return SERVER_ERROR_MESSAGE;
  return MESSAGE_BY_STATUS[status] ?? DEFAULT_MESSAGE;
}

export function toApiError(status, body) {
  const detail = extractDetail(body);
  const message = detail && HANGUL.test(detail) ? detail : fallbackMessage(status);
  return new ApiError(message, status, detail);
}

export function networkError() {
  return new ApiError(MESSAGE_BY_STATUS[0], 0);
}
