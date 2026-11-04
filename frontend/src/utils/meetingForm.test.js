import { describe, it, expect } from 'vitest';
import { meetingToFormValues, capacityToNumber } from './meetingForm';

describe('meetingToFormValues', () => {
  it('기존 모임 값을 입력 폼 값으로 바꾼다', () => {
    const values = meetingToFormValues({
      name: '팀플', purpose: '스터디', desired_time: '오후', desired_location: '도서관', capacity: 4, duration_minutes: 90,
    });
    expect(values).toEqual({
      name: '팀플', purpose: '스터디', customPurpose: '', time: '오후', place: '도서관', capacity: '4명', duration: '90',
    });
  });

  it('목록에 없는 목적은 기타로 넣는다', () => {
    const values = meetingToFormValues({ name: 'x', purpose: '팀플 회의', capacity: 2, duration_minutes: 60 });
    expect(values.purpose).toBe('기타');
    expect(values.customPurpose).toBe('팀플 회의');
  });

  it('목적이 없으면 비워 둔다', () => {
    const values = meetingToFormValues({ name: 'x', purpose: '', capacity: 2, duration_minutes: 60 });
    expect(values.purpose).toBe('');
  });

  it('8명 이상은 하나의 선택지로 묶는다', () => {
    expect(meetingToFormValues({ name: 'x', capacity: 12, duration_minutes: 60 }).capacity).toBe('8명 이상');
  });
});

describe('capacityToNumber', () => {
  it('선택지를 숫자로 바꾼다', () => {
    expect(capacityToNumber('4명')).toBe(4);
    expect(capacityToNumber('8명 이상')).toBe(8);
  });

  it('8명 넘는 기존 정원은 수정 시 줄이지 않는다', () => {
    expect(capacityToNumber('8명 이상', 12)).toBe(12);
  });
});
