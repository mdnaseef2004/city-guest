import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import Modal from './Modal';
import getCroppedImg from '../utils/cropImage';
import toast from 'react-hot-toast';

const ImageCropper = ({ imageSrc, onCropComplete, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [loading, setLoading] = useState(false);

  const onCropCompleteHandler = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    try {
      setLoading(true);
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, 0);
      
      // Convert blob to file so it plays nice with our existing file upload
      const file = new File([croppedBlob], 'cropped-image.jpg', { type: 'image/jpeg' });
      onCropComplete(file, URL.createObjectURL(croppedBlob));
    } catch (e) {
      console.error(e);
      toast.error('Failed to crop image');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
      isOpen={true} 
      onClose={onCancel} 
      title="Adjust Photo"
      confirmText="Apply Crop"
      onConfirm={handleSave}
    >
      <div style={{ position: 'relative', width: '100%', height: '400px', background: '#333', borderRadius: '8px', overflow: 'hidden' }}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1} // Square aspect ratio (for avatar)
          onCropChange={setCrop}
          onCropComplete={onCropCompleteHandler}
          onZoomChange={setZoom}
          cropShape="round" // Shows a circular overlay to preview how it looks as an avatar
        />
      </div>
      <div style={{ padding: '16px 0 0', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '14px', fontWeight: 500 }}>Zoom</span>
        <input
          type="range"
          value={zoom}
          min={1}
          max={3}
          step={0.1}
          aria-labelledby="Zoom"
          onChange={(e) => setZoom(e.target.value)}
          style={{ flex: 1, accentColor: 'var(--primary)' }}
        />
      </div>
    </Modal>
  );
};

export default ImageCropper;
