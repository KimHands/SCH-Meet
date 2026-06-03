import { useState } from 'react'

function ScheduleUpload({ onUploadSuccess }) {
  const [etatUrl, setEtatUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!etatUrl.trim()) {
      setError('에브리타임 URL을 입력해주세요.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/schedules/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etat_url: etatUrl }),
      })

      if (!res.ok) throw new Error('시간표 등록에 실패했습니다.')

      const data = await res.json()
      onUploadSuccess(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h2 className="card-title">에브리타임 시간표 등록</h2>
      <p className="card-desc">
        에브리타임 시간표 내보내기 URL을 붙여넣으면 자동으로 등록돼요.
      </p>
      <form onSubmit={handleSubmit} className="form">
        <input
          type="url"
          className="input"
          placeholder="https://everytime.kr/..."
          value={etatUrl}
          onChange={(e) => setEtatUrl(e.target.value)}
        />
        {error && <p className="error-msg">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? '등록 중...' : '시간표 등록'}
        </button>
      </form>
    </div>
  )
}

export default ScheduleUpload
