from .common import method_not_allowed, not_implemented


def user_me(request):
    if request.method not in ['GET', 'PATCH']:
        return method_not_allowed()
    return not_implemented('B-02 /api/user/me/')