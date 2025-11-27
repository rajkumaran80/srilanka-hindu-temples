import { useState, useEffect } from 'react';
import TempleManagement from './TempleManagement';
import PhotoApproval from './PhotoApproval';
import SuggestedTempleApproval from './SuggestedTempleApproval';
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState('temple-management');

  useEffect(() => {
    // Check URL path on load
    const path = window.location.pathname;
    if (path === '/photo-approval') {
      setCurrentPage('photo-approval');
    } else if (path === '/suggested-temple-approval') {
      setCurrentPage('suggested-temple-approval');
    } else {
      setCurrentPage('temple-management');
    }

    // Listen for browser back/forward
    const handlePopState = () => {
      const newPath = window.location.pathname;
      if (newPath === '/photo-approval') {
        setCurrentPage('photo-approval');
      } else if (newPath === '/suggested-temple-approval') {
        setCurrentPage('suggested-temple-approval');
      } else {
        setCurrentPage('temple-management');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (page) => {
    setCurrentPage(page);
    // Update URL without page reload
    let newPath = '/';
    if (page === 'photo-approval') {
      newPath = '/photo-approval';
    } else if (page === 'suggested-temple-approval') {
      newPath = '/suggested-temple-approval';
    }
    window.history.pushState(null, '', newPath);
  };

  return (
    <div className="App">
      <nav className="admin-nav">
        <div className="nav-container">
          <h1 className="nav-title">Sri Lanka Hindu Temples Admin</h1>
          <div className="nav-links">
            <button
              onClick={() => navigateTo('temple-management')}
              className={`nav-link ${currentPage === 'temple-management' ? 'active' : ''}`}
            >
              Temple Management
            </button>
            <button
              onClick={() => navigateTo('photo-approval')}
              className={`nav-link ${currentPage === 'photo-approval' ? 'active' : ''}`}
            >
              Photo Approval
            </button>
            <button
              onClick={() => navigateTo('suggested-temple-approval')}
              className={`nav-link ${currentPage === 'suggested-temple-approval' ? 'active' : ''}`}
            >
              Suggested Temples
            </button>
          </div>
        </div>
      </nav>

      {currentPage === 'temple-management' && <TempleManagement />}
      {currentPage === 'photo-approval' && <PhotoApproval />}
      {currentPage === 'suggested-temple-approval' && <SuggestedTempleApproval />}
    </div>
  )
}

export default App
