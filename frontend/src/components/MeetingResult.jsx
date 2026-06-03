function MeetingResult({ slots }) {
  if (!slots || slots.length === 0) {
    return (
      <div className="card empty-state">
        <p>아직 추천 시간이 없어요. 모든 팀원이 시간표를 등록하면 결과가 나타납니다.</p>
      </div>
    )
  }

  return (
    <div className="meeting-result">
      <h2 className="section-title">AI 추천 만남 시간</h2>
      <ul className="slot-list">
        {slots.map((slot, index) => (
          <li key={slot.id} className={`slot-item rank-${index + 1}`}>
            <span className="slot-rank">{index + 1}순위</span>
            <div className="slot-info">
              <p className="slot-time">{slot.day} {slot.start_time} ~ {slot.end_time}</p>
              <p className="slot-reason">{slot.reason}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default MeetingResult
