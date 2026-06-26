from django.http import JsonResponse


def method_not_allowed():
    return JsonResponse({'detail': 'Method not allowed'}, status=405)


def not_implemented(endpoint_name):
    return JsonResponse(
        {
            'detail': 'API endpoint stub',
            'endpoint': endpoint_name,
        },
        status=501,
    )
