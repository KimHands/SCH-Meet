import { useNavigate } from 'react-router-dom'

function HomePage() {
  const navigate = useNavigate()

  function handleGoogleLogin() {
    // 백엔드 Google SSO 엔드포인트로 연결 (Week 3 연동 예정)
    window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google/`
  }

  return (
    <div className="page home-page">
      <section className="hero">
        <h1 className="hero-title">모두의 일정을 한 번에</h1>
        <p className="hero-desc">
          에브리타임 시간표를 등록하면 AI가 팀원 모두가 가능한 만남 시간을 추천해줘요.
        </p>
        <div className="hero-actions">
          <button className="btn btn-primary btn-lg" onClick={handleGoogleLogin}>
            Google로 시작하기
          </button>
          <button
            className="btn btn-outline btn-lg"
            onClick={() => navigate('/onboarding')}
          >
            미리 둘러보기
          </button>
        </div>
      </section>

      <section className="features">
        <div className="feature-card">
          <span className="feature-icon">📅</span>
          <h3>자동 시간표 등록</h3>
          <p>에브리타임 URL 하나로 수업 시간표가 자동으로 등록돼요.</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">🤝</span>
          <h3>공통 공강 계산</h3>
          <p>팀원 모두의 일정을 비교해 겹치는 빈 시간을 찾아요.</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">✨</span>
          <h3>AI 순위 추천</h3>
          <p>단순한 빈 시간이 아닌 가장 적합한 시간을 이유와 함께 알려줘요.</p>
        </div>
      </section>
    </div>
  )
}

export default HomePage
