import React, { useState, useEffect } from 'react';
import './TempleDetail.css';
import { API_BASE_URL } from '../Constants';

const TempleDetail = ({ temple, onClose }) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadMessageType, setUploadMessageType] = useState(''); // 'success' or 'error'
  const [activeTab, setActiveTab] = useState('photos');
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentMessage, setCommentMessage] = useState('');
  const [commentMessageType, setCommentMessageType] = useState(''); // 'success' or 'error'
  const [showSuggestNameForm, setShowSuggestNameForm] = useState(false);
  const [suggestedNameText, setSuggestedNameText] = useState('');
  const [submittingSuggestedName, setSubmittingSuggestedName] = useState(false);
  const [suggestNameMessage, setSuggestNameMessage] = useState('');
  const [suggestNameMessageType, setSuggestNameMessageType] = useState(''); // 'success' or 'error'
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingMessage, setRatingMessage] = useState('');
  const [ratingMessageType, setRatingMessageType] = useState(''); // 'success' or 'error'

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

  // Auto-hide upload messages after 3 seconds
  useEffect(() => {
    if (uploadMessage) {
      const timer = setTimeout(() => {
        setUploadMessage('');
        setUploadMessageType('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [uploadMessage]);

  // Auto-hide comment messages after 3 seconds
  useEffect(() => {
    if (commentMessage) {
      const timer = setTimeout(() => {
        setCommentMessage('');
        setCommentMessageType('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [commentMessage]);

  // Auto-hide suggest name messages after 3 seconds
  useEffect(() => {
    if (suggestNameMessage) {
      const timer = setTimeout(() => {
        setSuggestNameMessage('');
        setSuggestNameMessageType('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [suggestNameMessage]);

  // Auto-hide rating messages after 3 seconds
  useEffect(() => {
    if (ratingMessage) {
      const timer = setTimeout(() => {
        setRatingMessage('');
        setRatingMessageType('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [ratingMessage]);

  const submitComment = async () => {
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    setCommentMessage('');
    setCommentMessageType('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/update_temple.ts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'comment',
          templeId: temple.id,
          comment: commentText.trim(),
        }),
      });

      if (response.ok) {
        setCommentMessage('Comment added successfully!');
        setCommentMessageType('success');
        setCommentText('');
        setShowCommentForm(false);
      } else {
        setCommentMessage('Failed to add comment. Please try again.');
        setCommentMessageType('error');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      setCommentMessage('Error submitting comment. Please try again.');
      setCommentMessageType('error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const submitSuggestedName = async () => {
    if (!suggestedNameText.trim()) return;

    setSubmittingSuggestedName(true);
    setSuggestNameMessage('');
    setSuggestNameMessageType('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/update_temple.ts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'suggest_name',
          templeId: temple.id,
          suggestedName: suggestedNameText.trim(),
        }),
      });

      if (response.ok) {
        setSuggestNameMessage('Suggested name submitted successfully!');
        setSuggestNameMessageType('success');
        setSuggestedNameText('');
        setShowSuggestNameForm(false);
      } else {
        setSuggestNameMessage('Failed to submit suggested name. Please try again.');
        setSuggestNameMessageType('error');
      }
    } catch (error) {
      console.error('Error submitting suggested name:', error);
      setSuggestNameMessage('Error submitting suggested name. Please try again.');
      setSuggestNameMessageType('error');
    } finally {
      setSubmittingSuggestedName(false);
    }
  };

  const submitRating = async () => {
    if (rating === 0) {
      setRatingMessage('Please select at least one star.');
      setRatingMessageType('error');
      return;
    }

    setSubmittingRating(true);
    setRatingMessage('');
    setRatingMessageType('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/update_temple.ts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'rating',
          templeId: temple.id,
          rating: rating,
        }),
      });

      if (response.ok) {
        setRatingMessage(`Rating of ${rating} star${rating > 1 ? 's' : ''} submitted successfully!`);
        setRatingMessageType('success');
        setRating(0);
        setHoverRating(0);
      } else {
        setRatingMessage('Failed to submit rating. Please try again.');
        setRatingMessageType('error');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      setRatingMessage('Error submitting rating. Please try again.');
      setRatingMessageType('error');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);

    // Validate file types (images only)
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    if (validFiles.length !== files.length) {
      setUploadMessage('Please select only image files.');
      setUploadMessageType('error');
      return;
    }

    setSelectedFiles(validFiles);
    setUploadMessage('');
    setUploadMessageType('');
  };

  const compressImage = (file, maxSizeKB = 20) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions (max 800px width/height)
        let { width, height } = img;
        const maxDimension = 800;

        if (width > height) {
          if (width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        // Try different quality levels until under maxSizeKB
        let quality = 0.9;
        let compressedDataUrl;

        do {
          compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          const sizeInBytes = (compressedDataUrl.length * 3) / 4; // Approximate base64 to bytes
          const sizeInKB = sizeInBytes / 1024;

          if (sizeInKB <= maxSizeKB || quality <= 0.1) {
            break;
          }

          quality -= 0.1;
        } while (quality > 0.1);

        resolve(compressedDataUrl);
      };

      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000, onRetry) => {
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt > maxRetries) throw error;
        if (onRetry) onRetry(attempt + 1);
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  const uploadPhotos = async () => {
    if (selectedFiles.length === 0) return;

    setUploadingPhotos(true);
    setUploadMessage('');
    setUploadMessageType('');

    try {
      const file = selectedFiles[0];

      // Step 1: Compress the image to under 20KB
      setUploadMessage('Compressing image...');
      const compressedDataUrl = await compressImage(file, 20);

      // Convert data URL to blob for upload
      const response = await fetch(compressedDataUrl);
      const compressedBlob = await response.blob();

      // Step 2: Get presigned URL from Azure
      setUploadMessage('Getting upload URL...');
      const presignedResponse = await fetch(`${API_BASE_URL}/api/presigned_upload_photo.ts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templeId: temple.id,
          fileType: compressedBlob.type || 'image/jpeg'
        }),
      });

      if (!presignedResponse.ok) {
        const errorData = await presignedResponse.json().catch(() => ({}));
        setUploadMessage(`Failed to get upload URL: ${errorData.error || 'Unknown error'}`);
        setUploadMessageType('error');
        return;
      }

      const presignedData = await presignedResponse.json();
      const { presignedUrl, blobName } = presignedData;

      // Step 3: Upload photo directly to Azure blob storage with retry logic
      setUploadMessage('Uploading photo...');
      const uploadResponse = await retryWithBackoff(
        async () => {
          const response = await fetch(presignedUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': compressedBlob.type || 'image/jpeg',
              'x-ms-blob-type': 'BlockBlob',
            },
            body: compressedBlob,
          });
          if (!response.ok) {
            throw new Error(`Upload failed with status ${response.status}`);
          }
          return response;
        },
        3, // maxRetries
        1000, // baseDelay
        (attempt) => {
          setUploadMessage(`Retrying upload (attempt ${attempt}/4)...`);
        }
      );

      // Step 4: Add the photo URL to unapproved_photos
      setUploadMessage('Adding to review queue...');

      // Construct the full blob URL (without SAS token for permanent access)
      const blobUrl = presignedUrl.split('?')[0]; // Remove SAS token

      try {
        const unapprovedResponse = await fetch(`${API_BASE_URL}/api/add_unapproved_photo.ts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            templeId: temple.id,
            photoName: blobUrl // Use the full blob URL
          }),
        });

        if (unapprovedResponse.ok) {
          setUploadMessage('Photo uploaded and added to review queue successfully!');
          setUploadMessageType('success');
        } else {
          // Photo uploaded to storage but failed to add to unapproved_photos
          const errorData = await unapprovedResponse.json().catch(() => ({}));
          setUploadMessage(`Photo uploaded but failed to add to review queue: ${errorData.error || 'Unknown error'}`);
          setUploadMessageType('error');
        }
      } catch (unapprovedError) {
        // Photo uploaded to storage but failed to call unapproved API
        setUploadMessage('Photo uploaded but failed to add to review queue. Please try again.');
        setUploadMessageType('error');
      }

      setSelectedFiles([]);
      // Reset file input
      const fileInput = document.getElementById('photo-upload');
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Error uploading photo:', error);
      setUploadMessage(`Error uploading photo: ${error.message || 'Unknown error'}`);
      setUploadMessageType('error');
    } finally {
      setUploadingPhotos(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>

        <div className="temple-info">
          <h2>{temple.name}</h2>
          <p className="location">{temple.location}</p>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-button ${activeTab === 'photos' ? 'active' : ''}`}
            onClick={() => setActiveTab('photos')}
          >
            Photos
          </button>
          <button
            className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button
            className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
          <button
            className={`tab-button ${activeTab === 'actions' ? 'active' : ''}`}
            onClick={() => setActiveTab('actions')}
          >
            Actions
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'photos' && (
            <div className="tab-pane">
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

              {photos.length === 0 && (
                <div className="no-photos-message">
                  <p>No photos available for this temple.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'details' && (
            <div className="tab-pane">
              <div className="temple-details">
                <div className="detail-row">
                  <strong>Deity:</strong> {temple.deity || 'Not specified'}
                </div>
                <div className="detail-row">
                  <strong>Temple Type:</strong> {temple.temple_type || 'Not specified'}
                </div>
                <div className="detail-row">
                  <strong>District:</strong> {temple.district || 'Not specified'}
                </div>
                <div className="detail-row">
                  <strong>Description:</strong> {temple.description || 'No description available'}
                </div>
                <div className="detail-row">
                  <strong>Coordinates:</strong> {temple.latitude?.toFixed(6)}, {temple.longitude?.toFixed(6)}
                </div>
                <div className="detail-row">
                  <strong>Level:</strong> {temple.level || temple.temple_level || 3}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="tab-pane">
              <div className="temple-history">
                <p>History information will be displayed here when available.</p>
                <p>This section will show the historical background and significance of the temple.</p>
              </div>
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="tab-pane">
              <div className="actions-section">
                <button className="action-btn navigate-btn" onClick={handleNavigate}>
                  Get Directions
                </button>

                <div className="action-group">
                  <h4>Upload Photo</h4>
                  <div className="photo-upload-section">
                    <p>You can upload photos to help improve this temple's listing.</p>

                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      disabled={uploadingPhotos}
                    />

                    {selectedFiles.length > 0 && (
                      <div>Selected: {selectedFiles.length} file</div>
                    )}

                    <button
                      onClick={uploadPhotos}
                      disabled={selectedFiles.length === 0 || uploadingPhotos}
                    >
                      {uploadingPhotos ? 'Uploading...' : 'Upload Photo'}
                    </button>
                  </div>
                </div>

                <div className="action-group">
                  <h4>Rate Temple</h4>
                  <div className="rating-section">
                    <p>Rate this temple based on popularity:</p>
                    <div className="star-rating">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className={`star ${star <= (hoverRating || rating) ? 'filled' : ''}`}
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          disabled={submittingRating}
                          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    {rating > 0 && (
                      <div className="rating-display">
                        {rating} star{rating > 1 ? 's' : ''} selected
                      </div>
                    )}
                    <button
                      className="submit-rating-btn"
                      onClick={submitRating}
                      disabled={rating === 0 || submittingRating}
                    >
                      {submittingRating ? 'Submitting...' : 'Submit Rating'}
                    </button>
                  </div>
                </div>

                <div className="action-group">
                  <h4>Suggest Name</h4>
                  {!showSuggestNameForm ? (
                    <button
                      className="action-btn"
                      onClick={() => setShowSuggestNameForm(true)}
                    >
                      Suggest Alternative Name
                    </button>
                  ) : (
                    <div className="form-container">
                      <input
                        type="text"
                        value={suggestedNameText}
                        onChange={(e) => setSuggestedNameText(e.target.value)}
                        placeholder="Enter suggested temple name..."
                        disabled={submittingSuggestedName}
                      />
                      <div className="form-buttons">
                        <button
                          className="submit-btn"
                          onClick={submitSuggestedName}
                          disabled={submittingSuggestedName || !suggestedNameText.trim()}
                        >
                          {submittingSuggestedName ? 'Submitting...' : 'Submit'}
                        </button>
                        <button
                          className="cancel-btn"
                          onClick={() => {
                            setShowSuggestNameForm(false);
                            setSuggestedNameText('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="action-group">
                  <h4>Add Comment</h4>
                  {!showCommentForm ? (
                    <button
                      className="action-btn"
                      onClick={() => setShowCommentForm(true)}
                    >
                      Add Comment
                    </button>
                  ) : (
                    <div className="form-container">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Enter your comment..."
                        rows={3}
                        disabled={submittingComment}
                      />
                      <div className="form-buttons">
                        <button
                          className="submit-btn"
                          onClick={submitComment}
                          disabled={submittingComment || !commentText.trim()}
                        >
                          {submittingComment ? 'Submitting...' : 'Submit'}
                        </button>
                        <button
                          className="cancel-btn"
                          onClick={() => {
                            setShowCommentForm(false);
                            setCommentText('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {(uploadMessage || commentMessage || suggestNameMessage || ratingMessage) && (
                  <div className="messages-section">
                    {uploadMessage && (
                      <div className={`message-box ${uploadMessageType === 'success' ? 'message-success' : 'message-error'}`}>
                        {uploadMessage}
                      </div>
                    )}
                    {ratingMessage && (
                      <div className={`message-box ${ratingMessageType === 'success' ? 'message-success' : 'message-error'}`}>
                        {ratingMessage}
                      </div>
                    )}
                    {commentMessage && (
                      <div className={`message-box ${commentMessageType === 'success' ? 'message-success' : 'message-error'}`}>
                        {commentMessage}
                      </div>
                    )}
                    {suggestNameMessage && (
                      <div className={`message-box ${suggestNameMessageType === 'success' ? 'message-success' : 'message-error'}`}>
                        {suggestNameMessage}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TempleDetail;
