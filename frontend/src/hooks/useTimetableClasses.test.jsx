import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useTimetableClasses } from './useTimetableClasses';
import { ApiError } from '../api/errors';
import * as timetableApi from '../api/timetable';

vi.mock('../api/timetable', () => ({
  getTimetableClasses: vi.fn(),
  deleteTimetableClass: vi.fn(),
  deleteAllTimetableClasses: vi.fn(),
}));

const ROW_A = { id: 1, name: '자료구조' };
const ROW_B = { id: 2, name: '운영체제' };

function deferred() {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
}

describe('useTimetableClasses', () => {
  let current;
  let root;

  async function mountWith(rows) {
    timetableApi.getTimetableClasses.mockResolvedValueOnce(rows);
    function Harness() {
      current = useTimetableClasses();
      return null;
    }
    root = createRoot(document.createElement('div'));
    await act(async () => { root.render(<Harness />); });
  }

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    vi.resetAllMocks();
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it('삭제 전에 시작한 조회가 늦게 도착해도 지운 수업을 되살리지 않는다', async () => {
    await mountWith([ROW_A, ROW_B]);
    const staleLoad = deferred();
    timetableApi.getTimetableClasses.mockReturnValueOnce(staleLoad.promise);
    timetableApi.getTimetableClasses.mockResolvedValueOnce([ROW_B]);
    timetableApi.deleteTimetableClass.mockResolvedValueOnce(null);

    await act(async () => { current.reload(); });
    await act(async () => { await current.removeOne(ROW_A.id); });
    await act(async () => { staleLoad.resolve([ROW_A, ROW_B]); });

    expect(current.classes).toEqual([ROW_B]);
    expect(current.loading).toBe(false);
  });

  it('이미 없어진 수업(404)은 목록에서 뺀다', async () => {
    await mountWith([ROW_A, ROW_B]);
    timetableApi.deleteTimetableClass.mockRejectedValueOnce(new ApiError('없음', 404));

    await act(async () => { await current.removeOne(ROW_A.id); });

    expect(current.classes).toEqual([ROW_B]);
  });

  it('다른 삭제 오류는 호출자에게 알리고 목록을 유지한다', async () => {
    await mountWith([ROW_A]);
    timetableApi.deleteTimetableClass.mockRejectedValueOnce(new ApiError('서버 오류', 500));

    await act(async () => {
      await expect(current.removeOne(ROW_A.id)).rejects.toThrow('서버 오류');
    });

    expect(current.classes).toEqual([ROW_A]);
  });
});
