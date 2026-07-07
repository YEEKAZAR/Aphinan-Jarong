import React, { useRef, useState, useCallback, useEffect } from 'react';
import Loader from './Loader';

interface ImageUploaderProps {
  onFileSelect: (file: File, previewUrl: string) => void;
  imagePreview: string | null;
  isLoading: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onFileSelect, imagePreview, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback((file: File) => {
      if (file && file.type.startsWith('image/')) {
        const previewUrl = URL.createObjectURL(file);
        onFileSelect(file, previewUrl);
      } else {
        console.error("Invalid file type.");
        // Consider adding user-facing error feedback
      }
  }, [onFileSelect]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleAreaClick = () => {
    if (!isLoading) {
      fileInputRef.current?.click();
    }
  };

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, dragging: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) {
      setIsDragging(dragging);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e, false);
    if (isLoading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
        processFile(file);
    }
  }, [isLoading, processFile]);

  useEffect(() => {
    // Cleanup function to revoke object URL when component unmounts or image changes
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);


  return (
    <div
      onClick={handleAreaClick}
      onDragEnter={(e) => handleDragEvents(e, true)}
      onDragLeave={(e) => handleDragEvents(e, false)}
      onDragOver={(e) => handleDragEvents(e, true)}
      onDrop={handleDrop}
      className={`
        w-full h-48 border-2 border-dashed rounded-lg flex items-center justify-center
        text-center p-4 transition-colors duration-300 cursor-pointer relative overflow-hidden
        ${isLoading ? 'bg-gray-800/50 cursor-not-allowed' : 'bg-gray-900 hover:bg-gray-800'}
        ${isDragging ? 'border-cyan-500 bg-gray-800' : 'border-gray-600'}
      `}
      aria-label="Image uploader and drop zone"
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/png, image/jpeg, image/webp"
        disabled={isLoading}
      />
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center z-10">
            <Loader />
        </div>
      )}
      {imagePreview && !isLoading ? (
        <img src={imagePreview} alt="Preview" className="max-h-full max-w-full object-contain rounded-md" />
      ) : (
        <div className="text-gray-400 pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="mt-2">คลิกเพื่ออัปโหลด หรือลากและวางรูปภาพที่นี่</p>
          <p className="text-xs text-gray-500">PNG, JPG, WEBP</p>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
