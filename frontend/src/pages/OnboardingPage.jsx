import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ScheduleUpload from '../components/ScheduleUpload.jsx'

const DAYS = ['월', '화', '수', '목', '금', '토']

function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [fixedSchedules, setFixedSchedules] = useState([])
  const [newSchedule, setNewSchedule] = useState({ title: '', day: '월', start_time: '', end_time: '' })

  function handleScheduleUploaded(data) {
    setStep(2)
  }

  function handleAddFixed() {
    if (!newSchedule.title || !newSchedule.start_time || !newSchedule.end_time) return
    setFixedSchedules((prev) => [...prev, { ...newSchedule, id: Date.now() }])
    setNewSchedule({ title: '', day: '월', start_time: '', end_time: '' })
  }

  function handleRemoveFixed(id) {
    setFixedSchedules((prev) => prev.filter((s) => s.id !== id))
  }

  function handleFinish() {
    // 고정 일정 저장 후 홈으로 (백엔드 연동은 Week 3)
    navigate('/')
  }

  return (
    <div className="page onboarding-page">
      <div className="step-indicator">
        <span className={`step ${step >= 1 ? 'active' : ''}`}>1. 시간표 등록</span>
        <span className="step-divider">›</span>
        <span className={`step ${step >= 2 ? 'active' : ''}`}>2. 고정 일정 추가</span>
      </div>

      {step === 1 && (
        <ScheduleUpload onUploadSuccess={handleScheduleUploaded} />
      )}

      {step === 2 && (
        <div className="card">
          <h2 className="card-title">고정 일정 추가</h2>
          <p className="card-desc">알바, 동아리 등 매주 반복되는 일정을 추가해주세요.</p>

          <div className="fixed-schedule-form">
            <input
              className="input"
              placeholder="일정 이름 (예: 카페 알바)"
              value={newSchedule.title}
              onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })}
            />
            <select
              className="input"
              value={newSchedule.day}
              onChange={(e) => setNewSchedule({ ...newSchedule, day: e.target.value })}
            >
              {DAYS.map((d) => <option key={d} value={d}>{d}요일</option>)}
            </select>
            <input
              type="time"
              className="input"
              value={newSchedule.start_time}
              onChange={(e) => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
            />
            <input
              type="time"
              className="input"
              value={newSchedule.end_time}
              onChange={(e) => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
            />
            <button className="btn btn-outline" onClick={handleAddFixed}>추가</button>
          </div>

          {fixedSchedules.length > 0 && (
            <ul className="fixed-list">
              {fixedSchedules.map((s) => (
                <li key={s.id} className="fixed-item">
                  <span>{s.day}요일 {s.start_time}~{s.end_time} {s.title}</span>
                  <button className="btn-remove" onClick={() => handleRemoveFixed(s.id)}>×</button>
                </li>
              ))}
            </ul>
          )}

          <button className="btn btn-primary" onClick={handleFinish}>완료</button>
        </div>
      )}
    </div>
  )
}

export default OnboardingPage
