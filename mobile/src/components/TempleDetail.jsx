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
  const [apiBaseUrl, setApiBaseUrl] = useState('');


    useEffect(() => {
      const initializeApi = async () => {
        setApiBaseUrl(API_BASE_URL);
      };
      initializeApi();
    }, []);

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

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const maxPhotos = 1;

    if (files.length > maxPhotos) {
      setUploadMessage(`You can select only ${maxPhotos} photo at a time.`);
      setUploadMessageType('error');
      return;
    }

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
      const presignedResponse = await fetch(`${apiBaseUrl}/api/presigned_upload_photo.ts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templeId: temple._id || temple.id,
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

      // Step 3: Upload photo directly to Azure blob storage
      setUploadMessage('Uploading photo...');
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': compressedBlob.type || 'image/jpeg',
          'x-ms-blob-type': 'BlockBlob',
        },
        body: compressedBlob,
      });

      if (!uploadResponse.ok) {
        setUploadMessage('Failed to upload photo to storage. Please try again.');
        setUploadMessageType('error');
        return;
      }

      // Step 4: Add the photo URL to unapproved_photos
      setUploadMessage('Adding to review queue...');

      // Construct the full blob URL (without SAS token for permanent access)
      const blobUrl = presignedUrl.split('?')[0]; // Remove SAS token

      try {
        const unapprovedResponse = await fetch(`${apiBaseUrl}/api/add_unapproved_photo.ts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            templeId: temple._id || temple.id,
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

        {photos.length < 5 && (
          <div className="photo-upload-section" style={{ marginTop: '15px', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Upload Photo</h4>
            <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#666' }}>
              Current photos: {photos.length}/5. You can upload 1 photo at a time.
            </p>

            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ marginBottom: '10px', fontSize: '12px' }}
              disabled={uploadingPhotos}
            />

            {selectedFiles.length > 0 && (
              <div style={{ marginBottom: '10px', fontSize: '12px', color: '#666' }}>
                Selected: {selectedFiles.length} file
              </div>
            )}

            <button
              onClick={uploadPhotos}
              disabled={selectedFiles.length === 0 || uploadingPhotos}
              style={{
                fontSize: '12px',
                padding: '6px 12px',
                backgroundColor: uploadingPhotos ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: uploadingPhotos ? 'not-allowed' : 'pointer'
              }}
            >
              {uploadingPhotos ? 'Uploading...' : 'Upload Photo'}
            </button>
          </div>
        )}

        {photos.length >= 5 && (
          <div style={{ marginTop: '15px', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#f5f5f5', textAlign: 'center' }}>
            <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
              Maximum of 5 photos reached. Cannot upload more photos.
            </p>
          </div>
        )}

        {uploadMessage && (
          <div style={{
            marginTop: '10px',
            padding: '8px',
            borderRadius: '3px',
            fontSize: '12px',
            fontWeight: 'bold',
            textAlign: 'center',
            backgroundColor: uploadMessageType === 'success' ? '#d4edda' : '#f8d7da',
            color: uploadMessageType === 'success' ? '#155724' : '#721c24',
            border: `1px solid ${uploadMessageType === 'success' ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            {uploadMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default TempleDetail;
