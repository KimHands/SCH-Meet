import { Link, useNavigate } from 'react-router-dom'

function Header({ isLoggedIn = false, userName = '' }) {
  const navigate = useNavigate()

  function handleLogout() {
    localStorage.removeItem('token')
    navigate('/')
  }

  return (
    <header className="header">
      <Link to="/" className="header-logo">
        SCH Meet
      </Link>
      <nav className="header-nav">
        {isLoggedIn ? (
          <>
            <span className="header-username">{userName}</span>
            <button className="btn btn-outline" onClick={handleLogout}>
              로그아웃
            </button>
          </>
        ) : (
          <Link to="/" className="btn btn-primary">
            로그인
          </Link>
        )}
      </nav>
    </header>
  )
}

export default Header
