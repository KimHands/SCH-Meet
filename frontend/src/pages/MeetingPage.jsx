import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import MeetingResult from '../components/MeetingResult.jsx'

function MeetingPage() {
  const { id } = useParams()
  const [meeting, setMeeting] = useState(null)
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchMeeting() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/meetings/${id}/`)
        if (!res.ok) throw new Error('모임 정보를 불러오지 못했습니다.')
        const data = await res.json()
        setMeeting(data)
        setSlots(data.recommended_slots || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchMeeting()
  }, [id])

  if (loading) return <div className="page"><p className="loading">불러오는 중...</p></div>
  if (error) return <div className="page"><p className="error-msg">{error}</p></div>

  return (
    <div className="page meeting-page">
      {meeting && (
        <>
          <div className="meeting-header">
            <h1 className="meeting-title">{meeting.title}</h1>
            <p className="meeting-meta">
              목적: {meeting.purpose} · 희망 시간: {meeting.duration_minutes}분 · 정원: {meeting.max_members}명
            </p>
          </div>

          <div className="meeting-invite">
            <p>초대 링크를 팀원에게 공유하세요</p>
            <div className="invite-box">
              <span className="invite-url">{window.location.href}</span>
              <button
                className="btn btn-outline"
                onClick={() => navigator.clipboard.writeText(window.location.href)}
              >
                복사
              </button>
            </div>
          </div>

          <MeetingResult slots={slots} />
        </>
      )}
    </div>
  )
}

export default MeetingPage
