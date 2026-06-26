from django.views.decorators.csrf import csrf_exempt

from .common import method_not_allowed, not_implemented


@csrf_exempt
def dashboard_summary(request):
    if request.method != 'GET':
        return method_not_allowed()
    return not_implemented('B-16 /api/dashboard/summary/')
