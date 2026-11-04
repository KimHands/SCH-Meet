import { useEffect, useState } from 'react';
import { colors, inputStyle } from '../styles/theme';
import Button from './Button';
import { getMyProfile, updateMyProfile } from '../api/auth';

const MAX_NICKNAME_LENGTH = 30;

// 닉네임이 없는 사용자에게만 보인다. 모임 참여자에게 보일 이름을 정하게 한다
export default function NicknamePrompt({ onError }) {
  const [needsNickname, setNeedsNickname] = useState(false);
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMyProfile()
      .then((profile) => setNeedsNickname(!profile?.nickname))
      .catch(() => setNeedsNickname(false));
  }, []);

  if (!needsNickname) return null;

  const handleSave = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) { onError('닉네임을 입력해주세요.'); return; }
    setSaving(true);
    try {
      await updateMyProfile({ nickname: trimmed });
      setNeedsNickname(false);
    } catch (e) {
      onError(e.message || '닉네임을 저장하지 못했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="nickname-prompt-title" style={{ marginTop: 14, backgroundColor: colors.surfaceContainerLow, borderRadius: 12, padding: 14 }}>
      <label id="nickname-prompt-title" htmlFor="nickname-prompt" style={{ display: 'block', fontSize: 13, fontWeight: '600', color: colors.onSurface }}>
        모임에서 보일 닉네임
      </label>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input
          id="nickname-prompt"
          value={nickname}
          maxLength={MAX_NICKNAME_LENGTH}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="예) 김민지"
          style={{ ...inputStyle(false), flex: 1, minWidth: 0, height: 44, fontSize: 13 }}
        />
        <Button
          label={saving ? '저장 중...' : '저장'}
          onClick={handleSave}
          disabled={saving}
          height={44} fontSize={12}
          style={{ paddingLeft: 14, paddingRight: 14 }}
        />
      </div>
    </section>
  );
}
