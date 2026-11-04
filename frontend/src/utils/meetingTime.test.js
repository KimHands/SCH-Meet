import { describe, it, expect } from 'vitest';
import { formatDateWithWeekday, formatConfirmedTime, meetingStatusLabel } from './meetingTime';

describe('formatDateWithWeekday', () => {
  it('날짜를 월·일·요일로 보여준다', () => {
    expect(formatDateWithWeekday('2026-11-09')).toBe('11월 9일 (월)');
  });

  it('시간대와 무관하게 같은 날짜를 보여준다', () => {
    expect(formatDateWithWeekday('2026-01-01')).toBe('1월 1일 (목)');
  });
});

describe('formatConfirmedTime', () => {
  it('날짜와 시간을 함께 보여준다', () => {
    const time = { date: '2026-11-09', day: 'MON', start_time: '13:00', end_time: '14:00' };
    expect(formatConfirmedTime(time)).toBe('11월 9일 (월) 13:00 ~ 14:00');
  });

  it('날짜가 없는 옛 확정은 요일로 보여준다', () => {
    const time = { date: null, day: 'MON', start_time: '13:00', end_time: '14:00' };
    expect(formatConfirmedTime(time)).toBe('월요일 13:00 ~ 14:00');
  });

  it('확정 시간이 없으면 미정으로 보여준다', () => {
    expect(formatConfirmedTime(null)).toBe('시간 미정');
  });
});

describe('meetingStatusLabel', () => {
  it('모임 상태를 한국어로 보여준다', () => {
    expect(meetingStatusLabel('OPEN')).toBe('조율 중');
    expect(meetingStatusLabel('CONFIRMED')).toBe('확정');
    expect(meetingStatusLabel('CLOSED')).toBe('종료');
  });
});
