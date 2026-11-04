const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_CODE_LABELS = { MON: '월', TUE: '화', WED: '수', THU: '목', FRI: '금', SAT: '토', SUN: '일' };
const STATUS_LABELS = { OPEN: '조율 중', CONFIRMED: '확정', CLOSED: '종료' };

// 'YYYY-MM-DD'를 UTC로 읽는 new Date(문자열)의 시간대 밀림을 피한다
export function formatDateWithWeekday(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const weekday = WEEKDAY_LABELS[new Date(year, month - 1, day).getDay()];
  return `${month}월 ${day}일 (${weekday})`;
}

export function formatConfirmedTime(confirmedTime) {
  if (!confirmedTime) return '시간 미정';
  const { date, day, start_time: start, end_time: end } = confirmedTime;
  const when = date ? formatDateWithWeekday(date) : `${DAY_CODE_LABELS[day] ?? day}요일`;
  return `${when} ${start} ~ ${end}`;
}

export function meetingStatusLabel(status) {
  return STATUS_LABELS[status] ?? status;
}
