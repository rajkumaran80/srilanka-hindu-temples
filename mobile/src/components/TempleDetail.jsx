import React, { useState, useEffect } from 'react';
import './TempleDetail.css';

const TempleDetail = ({ temple, onClose }) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const photos = temple.photos || [];

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const nextPhoto = () => {
    setCurrentPhotoIndex((prevIndex) =>
      prevIndex === photos.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prevIndex) =>
      prevIndex === 0 ? photos.length - 1 : prevIndex - 1
    );
  };

  const goToPhoto = (index) => {
    setCurrentPhotoIndex(index);
  };

  const handleNavigate = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${temple.latitude},${temple.longitude}`;
    window.open(url, '_blank');
  };

  // Handle touch start
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  // Handle touch move
  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);

  // Handle touch end
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      nextPhoto();
    } else if (isRightSwipe) {
      prevPhoto();
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft') {
        prevPhoto();
      } else if (e.key === 'ArrowRight') {
        nextPhoto();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>

        <div className="temple-info">
          <h2>{temple.name}</h2>
          <p className="location">{temple.location}</p>
          <p className="description">{temple.description}</p>
        </div>

        {photos.length > 0 && (
          <div className="photo-carousel">
            <button
              className="nav-btn prev-btn"
              onClick={prevPhoto}
              disabled={photos.length <= 1}
              aria-label="Previous photo"
            >
              ‹
            </button>

            <div
              className="photo-container"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <img
                src={photos[currentPhotoIndex]}
                alt={`${temple.name} ${currentPhotoIndex + 1}`}
                className="current-photo"
                style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'cover' }}
              />
            </div>

            <button
              className="nav-btn next-btn"
              onClick={nextPhoto}
              disabled={photos.length <= 1}
              aria-label="Next photo"
            >
              ›
            </button>
          </div>
        )}

        {photos.length > 1 && (
          <div className="photo-indicators">
            {photos.map((_, index) => (
              <button
                key={index}
                className={`indicator ${index === currentPhotoIndex ? 'active' : ''}`}
                onClick={() => goToPhoto(index)}
                aria-label={`Go to photo ${index + 1}`}
              />
            ))}
          </div>
        )}

        <button className="navigate-btn" onClick={handleNavigate}>Get Directions</button>
      </div>
    </div>
  );
};

export default TempleDetail;
