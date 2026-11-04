from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .common import method_not_allowed


@csrf_exempt
def health_check(request):
    """DB는 확인하지 않는다. DB 장애로 api 컨테이너가 재시작을 반복하면 안 된다."""
    if request.method != 'GET':
        return method_not_allowed()
    return JsonResponse({'status': 'ok'})
