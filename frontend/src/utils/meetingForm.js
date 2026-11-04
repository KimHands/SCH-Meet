import { DEFAULT_DURATION_MINUTES } from './duration';

export const PURPOSE_OPTIONS = ['조용한 회의', '스터디', '조별 과제', '친목 모임', '기타'];
export const CAPACITY_OPTIONS = ['2명', '3명', '4명', '5명', '6명', '7명', '8명 이상'];

const MAX_CAPACITY_OPTION = 8;

export const EMPTY_MEETING_FORM = {
  name: '',
  purpose: '',
  customPurpose: '',
  time: '',
  place: '',
  capacity: '',
  duration: String(DEFAULT_DURATION_MINUTES),
};

function purposeFields(purpose) {
  if (!purpose) return { purpose: '', customPurpose: '' };
  if (PURPOSE_OPTIONS.includes(purpose)) return { purpose, customPurpose: '' };
  return { purpose: '기타', customPurpose: purpose };
}

export function meetingToFormValues(meeting) {
  const capacity = meeting.capacity >= MAX_CAPACITY_OPTION ? '8명 이상' : `${meeting.capacity}명`;
  return {
    name: meeting.name ?? '',
    ...purposeFields(meeting.purpose),
    time: meeting.desired_time ?? '',
    place: meeting.desired_location ?? '',
    capacity,
    duration: String(meeting.duration_minutes),
  };
}

// "8명 이상"은 8로 읽되, 이미 8명을 넘게 잡은 모임은 수정한다고 줄이지 않는다
export function capacityToNumber(capacityOption, currentCapacity = 0) {
  const selected = parseInt(capacityOption.replace(/[^0-9]/g, ''), 10);
  return selected === MAX_CAPACITY_OPTION ? Math.max(selected, currentCapacity) : selected;
}
