from .common import method_not_allowed, not_implemented


def dashboard_summary(request):
    if request.method != 'GET':
        return method_not_allowed()
    return not_implemented('B-16 /api/dashboard/summary/')
