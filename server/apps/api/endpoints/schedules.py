from .common import method_not_allowed, not_implemented


def fixed_schedules(request):
    if request.method not in ['GET', 'POST']:
        return method_not_allowed()
    return not_implemented('B-05 /api/schedules/fixed/')


def fixed_schedule_detail(request, schedule_id):
    if request.method != 'DELETE':
        return method_not_allowed()
    return not_implemented(f'B-05 /api/schedules/fixed/{schedule_id}/')
