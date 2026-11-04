import { colors } from '../styles/theme';

const POSITION = {
  top:    { top: 20 },
  bottom: { bottom: 90 },
};

// useToast 훅과 함께 사용: const { toast, showToast } = useToast(); <Toast message={toast} />
export default function Toast({ message, position = 'top' }) {
  return (
    <div role="status" aria-live="polite">
      {message && (
        <div style={{
          position: 'fixed', left: '50%', transform: 'translateX(-50%)',
          ...POSITION[position],
          backgroundColor: colors.onSurface, color: '#fff',
          padding: '10px 18px', borderRadius: 99,
          fontSize: 13, fontWeight: '500',
          zIndex: 999,
          maxWidth: 'calc(100% - 32px)',
          textAlign: 'center',
        }}>
          {message}
        </div>
      )}
    </div>
  );
}
