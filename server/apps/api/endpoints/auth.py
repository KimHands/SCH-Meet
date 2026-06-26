from .common import method_not_allowed, not_implemented


def auth_login(request):
    if request.method != 'POST':
        return method_not_allowed()
    return not_implemented('B-01 /api/auth/login/')
