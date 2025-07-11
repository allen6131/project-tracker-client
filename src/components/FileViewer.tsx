import React, { useState, useEffect } from 'react';
import { ProjectFile } from '../types';
import { filesAPI } from '../services/api';

interface FileViewerProps {
  file: ProjectFile | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (file: ProjectFile) => void;
  onDelete: (file: ProjectFile) => void;
}

const FileViewer: React.FC<FileViewerProps> = ({ 
  file, 
  isOpen, 
  onClose, 
  onDownload, 
  onDelete 
}) => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && file) {
      loadFileContent();
    } else {
      // Clean up when closing
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
        setFileUrl(null);
      }
      setTextContent(null);
      setError(null);
    }
  }, [isOpen, file]);

  const loadFileContent = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const blob = await filesAPI.downloadFile(file.id);
      
      // For text files, read the content
      if (isTextFile(file.file_type, file.original_name)) {
        const text = await blob.text();
        setTextContent(text);
      } else {
        // For other files, create object URL
        const url = URL.createObjectURL(blob);
        setFileUrl(url);
      }
    } catch (err) {
      setError('Failed to load file content');
      console.error('File loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const isImage = (fileType: string, fileName: string) => {
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/svg+xml'];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    return imageTypes.includes(fileType) || imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  const isPdf = (fileType: string, fileName: string) => {
    return fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
  };

  const isVideo = (fileType: string, fileName: string) => {
    const videoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov', 'video/wmv'];
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv'];
    return videoTypes.includes(fileType) || videoExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  const isAudio = (fileType: string, fileName: string) => {
    const audioTypes = ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/flac'];
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a', '.wma'];
    return audioTypes.includes(fileType) || audioExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  const isTextFile = (fileType: string, fileName: string) => {
    const textTypes = ['text/plain', 'text/html', 'text/css', 'text/javascript', 'application/json', 'text/markdown'];
    const textExtensions = ['.txt', '.md', '.html', '.css', '.js', '.json', '.xml', '.csv', '.log', '.readme'];
    return textTypes.includes(fileType) || textExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  const isOfficeDocument = (fileType: string, fileName: string) => {
    const officeTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.ms-excel',
      'application/vnd.ms-powerpoint'
    ];
    const officeExtensions = ['.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt'];
    return officeTypes.includes(fileType) || officeExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderFileContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading file...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <svg className="w-16 h-16 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load File</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => file && onDownload(file)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Download File Instead
          </button>
        </div>
      );
    }

    if (!file) return null;

    // Image files
    if (isImage(file.file_type, file.original_name) && fileUrl) {
      return (
        <div className="flex items-center justify-center bg-gray-100 rounded-lg p-4">
          <img 
            src={fileUrl} 
            alt={file.original_name}
            className="max-w-full max-h-[70vh] object-contain"
            onError={() => setError('Failed to load image')}
          />
        </div>
      );
    }

    // PDF files
    if (isPdf(file.file_type, file.original_name) && fileUrl) {
      return (
        <div className="h-[70vh] bg-gray-100 rounded-lg">
          <iframe
            src={fileUrl}
            className="w-full h-full rounded-lg"
            title={file.original_name}
            onError={() => setError('Failed to load PDF')}
          />
        </div>
      );
    }

    // Video files
    if (isVideo(file.file_type, file.original_name) && fileUrl) {
      return (
        <div className="flex items-center justify-center bg-gray-100 rounded-lg p-4">
          <video 
            controls 
            className="max-w-full max-h-[70vh]"
            onError={() => setError('Failed to load video')}
          >
            <source src={fileUrl} type={file.file_type} />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    // Audio files
    if (isAudio(file.file_type, file.original_name) && fileUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-96 bg-gray-100 rounded-lg">
          <svg className="w-24 h-24 text-gray-400 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <audio 
            controls 
            className="w-full max-w-md"
            onError={() => setError('Failed to load audio')}
          >
            <source src={fileUrl} type={file.file_type} />
            Your browser does not support the audio tag.
          </audio>
          <p className="text-gray-600 mt-4 text-center">{file.original_name}</p>
        </div>
      );
    }

    // Text files
    if (isTextFile(file.file_type, file.original_name) && textContent !== null) {
      return (
        <div className="bg-gray-50 rounded-lg p-4">
          <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 overflow-auto max-h-[70vh]">
            {textContent}
          </pre>
        </div>
      );
    }

    // Office documents and other files - show info and download option
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center bg-gray-50 rounded-lg">
        <div className="text-6xl mb-4">
          {isOfficeDocument(file.file_type, file.original_name) ? '📄' : '📁'}
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{file.original_name}</h3>
        <p className="text-gray-500 mb-2">{formatBytes(file.file_size)}</p>
        <p className="text-gray-400 mb-6">
          {isOfficeDocument(file.file_type, file.original_name) 
            ? 'Office documents can\'t be previewed in the browser'
            : 'This file type can\'t be previewed in the browser'
          }
        </p>
        <button
          onClick={() => onDownload(file)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2z" />
          </svg>
          <span>Download File</span>
        </button>
      </div>
    );
  };

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-gray-900 truncate">{file.original_name}</h2>
            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
              <span>{formatBytes(file.file_size)}</span>
              <span>•</span>
              <span>{formatDate(file.created_at)}</span>
              {file.folder_name && (
                <>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                    <span>{file.folder_name}</span>
                  </span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3 ml-4">
            <button
              onClick={() => onDownload(file)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              title="Download"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(file)}
              className="p-2 text-red-600 hover:text-red-900 hover:bg-red-100 rounded-lg"
              title="Delete"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              title="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          {renderFileContent()}
        </div>
      </div>
    </div>
  );
};

export default FileViewer; 