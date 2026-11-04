import json
import re
from xml.etree.ElementTree import ParseError

import requests
from defusedxml import DefusedXmlException
from defusedxml import ElementTree
from django.db import transaction
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from ..models import FixedSchedule, TimetableClass
from .common import method_not_allowed
from .user import _get_authorized_user
from .throttle import check_rate_limit


EVERYTIME_HOSTS = {'everytime.kr', 'www.everytime.kr', 'm.everytime.kr'}
DAY_CODES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
EVERYTIME_INVALID_URL = '에브리타임 시간표 공유 URL이 아니에요. URL을 다시 확인해주세요.'
EVERYTIME_LOAD_FAILED = '에브리타임에서 시간표를 불러오지 못했어요. 잠시 후 다시 시도하거나 직접 입력해주세요.'
EVERYTIME_UNREADABLE = '시간표를 읽지 못했어요. 에브리타임 공개 설정을 확인하거나 직접 입력해주세요.'
EVERYTIME_EMPTY = '시간표가 비어 있거나 비공개예요. 에브리타임 공개 설정을 확인하거나 직접 입력해주세요.'


def _extract_everytime_identifier(url):
    if not isinstance(url, str):
        return None

    match = re.search(r'@([A-Za-z0-9]+)', url)
    if not match:
        return None

    return match.group(1)


def _is_everytime_url(url):
    match = re.match(r'^https?://([^/]+)(/.*)?$', url or '')
    if not match:
        return False

    host = match.group(1).split(':', 1)[0].lower()
    return host in EVERYTIME_HOSTS


def _parse_minute(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _everytime_slot_to_minutes(value):
    if value is None:
        return None
    return value * 5


def _minutes_to_clock_label(minute_value):
    hour = minute_value // 60
    minute = minute_value % 60
    return f'{hour:02d}:{minute:02d}'


def _time_to_minute(time_value):
    return time_value.hour * 60 + time_value.minute


def _minute_to_time_label(minute_value):
    hour = minute_value // 60
    minute = minute_value % 60
    return f'{hour:02d}:{minute:02d}'


def _merge_intervals(intervals):
    if not intervals:
        return []

    merged = []
    for start_minute, end_minute in sorted(intervals, key=lambda interval: (interval[0], interval[1])):
        if not merged or start_minute > merged[-1][1]:
            merged.append([start_minute, end_minute])
            continue

        merged[-1][1] = max(merged[-1][1], end_minute)

    return [
        {'start': _minute_to_time_label(start_minute), 'end': _minute_to_time_label(end_minute)}
        for start_minute, end_minute in merged
    ]


def _empty_weekly_timeline():
    return {day_code: [] for day_code in DAY_CODES}


MAX_EVERYTIME_RESPONSE_BYTES = 2 * 1024 * 1024


def _read_limited_text(response):
    """응답을 상한+1바이트까지만 읽어, 상한을 넘으면 None을 돌려준다."""
    body = response.raw.read(MAX_EVERYTIME_RESPONSE_BYTES + 1, decode_content=True)
    if len(body) > MAX_EVERYTIME_RESPONSE_BYTES:
        return None
    return body.decode(response.encoding or 'utf-8', errors='replace')


def _fit_column(field_name, value):
    """외부 값이 모델 길이를 넘으면 잘라 DB 오류를 막는다."""
    return value[:TimetableClass._meta.get_field(field_name).max_length]


def _parse_everytime_response(xml_text, source_identifier):
    if len(xml_text) > MAX_EVERYTIME_RESPONSE_BYTES:
        return None
    try:
        root = ElementTree.fromstring(xml_text)
    except (ParseError, DefusedXmlException):
        return None

    table = root.find('table')
    if table is None:
        return None

    parsed_classes = []
    parsed_subject_ids = set()
    subjects = table.findall('subject')

    for subject in subjects:
        subject_id = subject.attrib.get('id', '')
        internal = subject.find('internal')
        name = subject.find('name')
        professor = subject.find('professor')
        time_node = subject.find('time')
        place = subject.find('place')
        closed = subject.find('closed')

        data_nodes = list(time_node.findall('data')) if time_node is not None else []
        if not data_nodes:
            continue

        for data_node in data_nodes:
            day_index = _parse_minute(data_node.attrib.get('day'))
            start_minute = _everytime_slot_to_minutes(_parse_minute(data_node.attrib.get('starttime')))
            end_minute = _everytime_slot_to_minutes(_parse_minute(data_node.attrib.get('endtime')))

            if day_index is None or day_index < 0 or day_index >= len(DAY_CODES):
                continue
            if start_minute is None or end_minute is None or end_minute <= start_minute:
                continue

            parsed_classes.append(
                {
                    'year': int(table.attrib['year']) if table.attrib.get('year', '').isdigit() else None,
                    'semester': _fit_column('semester', table.attrib.get('semester', '')),
                    'name': _fit_column('name', name.attrib.get('value', '') if name is not None else ''),
                    'professor': _fit_column('professor', professor.attrib.get('value', '') if professor is not None else ''),
                    'day': DAY_CODES[day_index],
                    'start_minute': start_minute,
                    'end_minute': end_minute,
                    'place': _fit_column('place', data_node.attrib.get('place', '') or (place.attrib.get('value', '') if place is not None else '')),
                    'time_label': _fit_column('time_label', time_node.attrib.get('value', '') if time_node is not None else ''),
                    'closed': (closed.attrib.get('value', '0') == '1') if closed is not None else False,
                }
            )
            parsed_subject_ids.add(subject_id or f"{subject.findtext('name', default='')}-{day_index}-{start_minute}-{end_minute}")

    return {
        'year': table.attrib.get('year', ''),
        'semester': table.attrib.get('semester', ''),
        'source_identifier': _fit_column('source_identifier', table.attrib.get('identifier', source_identifier)),
        'parsed_classes': parsed_classes,
        'parsed_classes_count': len(parsed_subject_ids),
    }


@csrf_exempt
def timetable_upload_url(request):
    if request.method != 'POST':
        return method_not_allowed()

    user, error_response = _get_authorized_user(request)
    if error_response:
        return error_response

    try:
        body = json.loads(request.body.decode() or '{}')
    except Exception:
        body = None
    if not isinstance(body, dict):
        return JsonResponse({'detail': 'Invalid JSON body'}, status=400)

    url = body.get('url')
    if not isinstance(url, str) or not url.strip():
        return JsonResponse({'detail': 'url is required'}, status=400)

    rate_limited = check_rate_limit('everytime', user.id)
    if rate_limited:
        return rate_limited

    url = url.strip()
    if not _is_everytime_url(url):
        return JsonResponse({'detail': EVERYTIME_INVALID_URL}, status=400)

    identifier = _extract_everytime_identifier(url)
    if not identifier:
        return JsonResponse({'detail': EVERYTIME_INVALID_URL}, status=400)

    headers = {
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Origin': 'https://everytime.kr',
        'Referer': 'https://everytime.kr/',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
    }

    try:
        response = requests.post(
            'https://api.everytime.kr/find/timetable/table/friend',
            headers=headers,
            data={
                'identifier': identifier,
                'friendinfo': 'true',
            },
            timeout=15,
            stream=True,
        )
        with response:
            response_text = _read_limited_text(response) if response.status_code == 200 else None
    except requests.RequestException:
        return JsonResponse({'detail': EVERYTIME_LOAD_FAILED}, status=502)

    if response_text is None:
        return JsonResponse({'detail': EVERYTIME_LOAD_FAILED}, status=502)

    parsed_response = _parse_everytime_response(response_text, identifier)
    if not parsed_response:
        return JsonResponse({'detail': EVERYTIME_UNREADABLE}, status=502)
    if not parsed_response['parsed_classes']:
        return JsonResponse({'detail': EVERYTIME_EMPTY}, status=422)

    with transaction.atomic():
        TimetableClass.objects.filter(user=user, source='everytime').delete()
        TimetableClass.objects.bulk_create(
            [
                TimetableClass(
                    user=user,
                    source='everytime',
                    source_identifier=parsed_response['source_identifier'],
                    year=parsed_class['year'],
                    semester=parsed_class['semester'],
                    name=parsed_class['name'],
                    professor=parsed_class['professor'],
                    day=parsed_class['day'],
                    start_minute=parsed_class['start_minute'],
                    end_minute=parsed_class['end_minute'],
                    place=parsed_class['place'],
                    time_label=parsed_class['time_label'],
                    closed=parsed_class['closed'],
                )
                for parsed_class in parsed_response['parsed_classes']
            ]
        )

    return JsonResponse(
        {
            'status': 'success',
            'parsed_classes_count': parsed_response['parsed_classes_count'],
        },
        status=200,
    )


_DAY_ORDER = {day_code: index for index, day_code in enumerate(DAY_CODES)}


def _own_classes(user):
    """사용자가 관리하는 수업만. 확정 모임으로 생긴 항목은 모임 쪽에서 관리한다."""
    return TimetableClass.objects.filter(user=user).exclude(source='meeting')


def _serialize_timetable_class(timetable_class):
    return {
        'id': timetable_class.id,
        'name': timetable_class.name,
        'day': timetable_class.day,
        'start_time': _minute_to_time_label(timetable_class.start_minute),
        'end_time': _minute_to_time_label(timetable_class.end_minute),
        'professor': timetable_class.professor,
        'place': timetable_class.place,
    }


def _class_sort_key(timetable_class):
    return (_DAY_ORDER.get(timetable_class.day, len(DAY_CODES)), timetable_class.start_minute)


@csrf_exempt
def timetable_classes(request):
    if request.method not in ['GET', 'DELETE']:
        return method_not_allowed()

    user, error_response = _get_authorized_user(request)
    if error_response:
        return error_response

    if request.method == 'DELETE':
        _own_classes(user).delete()
        return HttpResponse(status=204)

    classes = sorted(_own_classes(user), key=_class_sort_key)
    return JsonResponse([_serialize_timetable_class(c) for c in classes], safe=False)


@csrf_exempt
def timetable_class_detail(request, class_id):
    if request.method != 'DELETE':
        return method_not_allowed()

    user, error_response = _get_authorized_user(request)
    if error_response:
        return error_response

    timetable_class = _own_classes(user).filter(id=class_id).first()
    if not timetable_class:
        return JsonResponse({'detail': 'Not found'}, status=404)

    timetable_class.delete()
    return HttpResponse(status=204)


def consolidated_timetables(request):
    if request.method != 'GET':
        return method_not_allowed()

    user, error_response = _get_authorized_user(request)
    if error_response:
        return error_response

    daily_events = {day_code: [] for day_code in DAY_CODES}

    for timetable_class in TimetableClass.objects.filter(user=user):
        if timetable_class.day not in daily_events:
            continue
        daily_events[timetable_class.day].append(
            {
                'start_minute': timetable_class.start_minute,
                'end_minute': timetable_class.end_minute,
                'item': {
                    'kind': 'timetable_class',
                    'title': timetable_class.name,
                    'source': timetable_class.source,
                    'professor': timetable_class.professor,
                    'place': timetable_class.place,
                    'time_label': timetable_class.time_label,
                    'closed': timetable_class.closed,
                },
            }
        )

    for fixed_schedule in FixedSchedule.objects.filter(user=user):
        start_minute = _time_to_minute(fixed_schedule.start_time)
        end_minute = _time_to_minute(fixed_schedule.end_time)
        for day_code in fixed_schedule.repeat_days or []:
            if day_code not in daily_events:
                continue
            daily_events[day_code].append(
                {
                    'start_minute': start_minute,
                    'end_minute': end_minute,
                    'item': {
                        'kind': 'fixed_schedule',
                        'title': fixed_schedule.title,
                        'source': 'fixed_schedule',
                    },
                }
            )

    payload = _empty_weekly_timeline()
    for day_code in DAY_CODES:
        events = sorted(daily_events[day_code], key=lambda event: (event['start_minute'], event['end_minute']))
        merged_blocks = []
        for event in events:
            if not merged_blocks or event['start_minute'] > merged_blocks[-1]['end_minute']:
                merged_blocks.append(
                    {
                        'start_minute': event['start_minute'],
                        'end_minute': event['end_minute'],
                        'start': _minutes_to_clock_label(event['start_minute']),
                        'end': _minutes_to_clock_label(event['end_minute']),
                        'items': [event['item']],
                    }
                )
                continue

            merged_blocks[-1]['end'] = _minutes_to_clock_label(max(merged_blocks[-1]['end_minute'], event['end_minute']))
            merged_blocks[-1]['end_minute'] = max(merged_blocks[-1]['end_minute'], event['end_minute'])
            merged_blocks[-1]['items'].append(event['item'])

        payload[day_code] = merged_blocks

    return JsonResponse(payload, status=200)
