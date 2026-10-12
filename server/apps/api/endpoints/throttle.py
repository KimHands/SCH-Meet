from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse


# scope: (허용 횟수, 기간(초))
DEFAULT_RATE_LIMITS = {
    'login': (20, 60),
    'refresh': (30, 60),
    'everytime': (10, 600),
    'ocr': (10, 600),
}


def client_ip(request):
    """프록시가 덧붙인 오른쪽 항목만 신뢰한다(왼쪽은 클라이언트가 위조 가능)."""
    trusted_proxy_count = getattr(settings, 'TRUSTED_PROXY_COUNT', 0)
    forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR', '')
    hops = [hop.strip() for hop in forwarded_for.split(',') if hop.strip()]
    if trusted_proxy_count and len(hops) >= trusted_proxy_count:
        return hops[-trusted_proxy_count]
    return request.META.get('REMOTE_ADDR', 'unknown')


def _limit_for(scope):
    limits = getattr(settings, 'RATE_LIMITS', None) or {}
    return limits.get(scope) or DEFAULT_RATE_LIMITS[scope]


def check_rate_limit(scope, identity):
    """제한을 넘으면 429 응답을, 아니면 None을 돌려준다."""
    max_requests, window_seconds = _limit_for(scope)
    cache_key = f'rate:{scope}:{identity}'
    cache.add(cache_key, 0, timeout=window_seconds)
    try:
        request_count = cache.incr(cache_key)
    except ValueError:
        cache.set(cache_key, 1, timeout=window_seconds)
        request_count = 1

    if request_count > max_requests:
        return JsonResponse({'detail': '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.'}, status=429)
    return None
