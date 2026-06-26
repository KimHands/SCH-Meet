from .common import method_not_allowed, not_implemented


def timetable_upload_url(request):
    if request.method != 'POST':
        return method_not_allowed()
    return not_implemented('B-03 /api/timetables/upload-url/')


def timetable_upload_image(request):
    if request.method != 'POST':
        return method_not_allowed()
    return not_implemented('B-04 /api/timetables/upload-image/')


def consolidated_timetables(request):
    if request.method != 'GET':
        return method_not_allowed()
    return not_implemented('B-06 /api/timetables/consolidated/')
