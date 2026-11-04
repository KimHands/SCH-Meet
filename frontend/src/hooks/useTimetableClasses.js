import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getTimetableClasses,
  deleteTimetableClass,
  deleteAllTimetableClasses,
} from '../api/timetable';

export function useTimetableClasses() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const latestLoadId = useRef(0);
  const loadInFlight = useRef(false);

  const reload = useCallback(() => {
    latestLoadId.current += 1;
    const loadId = latestLoadId.current;
    const isLatest = () => loadId === latestLoadId.current;

    loadInFlight.current = true;
    setLoading(true);
    setLoadError('');
    return getTimetableClasses()
      .then((data) => { if (isLatest()) setClasses(data ?? []); })
      .catch((e) => { if (isLatest()) setLoadError(e.message || '등록된 수업을 불러오지 못했어요.'); })
      .finally(() => {
        if (!isLatest()) return;
        loadInFlight.current = false;
        setLoading(false);
      });
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // 삭제 전에 시작한 조회는 지운 수업을 담고 있을 수 있으므로 버리고 다시 읽는다
  const reloadIfLoadInFlight = useCallback(() => {
    if (loadInFlight.current) return reload();
    return undefined;
  }, [reload]);

  const removeOne = useCallback(async (classId) => {
    try {
      await deleteTimetableClass(classId);
    } catch (e) {
      if (e.status !== 404) throw e;
    }
    setClasses((prev) => prev.filter((item) => item.id !== classId));
    await reloadIfLoadInFlight();
  }, [reloadIfLoadInFlight]);

  const removeAll = useCallback(async () => {
    await deleteAllTimetableClasses();
    setClasses([]);
    await reloadIfLoadInFlight();
  }, [reloadIfLoadInFlight]);

  return { classes, loading, loadError, reload, removeOne, removeAll };
}
