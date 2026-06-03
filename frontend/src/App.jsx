import { Routes, Route } from 'react-router-dom'
import Header from './components/Header.jsx'
import HomePage from './pages/HomePage.jsx'
import OnboardingPage from './pages/OnboardingPage.jsx'
import MeetingPage from './pages/MeetingPage.jsx'
import './App.css'

function App() {
  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/meeting/:id" element={<MeetingPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
