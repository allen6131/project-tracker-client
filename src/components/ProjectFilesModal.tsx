import React, { useState, useEffect, useCallback } from 'react';
import { Project, ProjectFile } from '../types';
import { filesAPI } from '../services/api';
import FileViewer from './FileViewer';

interface ProjectFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
}

const ProjectFilesModal: React.FC<ProjectFilesModalProps> = ({ isOpen, onClose, project }) => {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  
  // File viewer state
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [viewingFile, setViewingFile] = useState<ProjectFile | null>(null);

  const loadFiles = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    try {
      const response = await filesAPI.getProjectFiles(project.id);
      setFiles(response.files);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [project]);

  useEffect(() => {
    if (isOpen) {
      loadFiles();
    }
  }, [isOpen, loadFiles]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !project) return;
    setLoading(true);
    try {
      await filesAPI.uploadFile(project.id, uploadFile, isPublic);
      setUploadFile(null);
      loadFiles(); // Refresh file list
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileId: number) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      setLoading(true);
      try {
        await filesAPI.deleteFile(fileId);
        loadFiles(); // Refresh file list
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to delete file');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDownload = async (file: ProjectFile) => {
    try {
      const blob = await filesAPI.downloadFile(file.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setError('Failed to download file');
    }
  };
  
  const handleFileView = (file: ProjectFile) => {
    setViewingFile(file);
    setShowFileViewer(true);
  };

  const handleCloseViewer = () => {
    setShowFileViewer(false);
    setViewingFile(null);
  };

  const handleFileDelete = (file: ProjectFile) => {
    handleDelete(file.id);
    handleCloseViewer();
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Files for: {project?.name}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
        </div>

        <div className="p-6 space-y-4">
          {error && <div className="text-red-500 bg-red-100 p-3 rounded-lg">{error}</div>}

          {/* Upload section */}
          <div className="border p-4 rounded-lg space-y-3">
            <h3 className="font-semibold">Upload New File</h3>
            <input type="file" onChange={handleFileChange} className="w-full"/>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="isPublic" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
              <label htmlFor="isPublic">Public</label>
            </div>
            <button
              onClick={handleUpload}
              disabled={!uploadFile || loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:bg-blue-300"
            >
              {loading ? 'Uploading...' : 'Upload'}
            </button>
          </div>

          {/* Files list */}
          <div className="space-y-2">
            {files.map(file => (
              <div 
                key={file.id} 
                className="flex justify-between items-center p-2 border-b hover:bg-gray-50 cursor-pointer"
                onDoubleClick={() => handleFileView(file)}
              >
                <div>
                  <p className="font-semibold">{file.original_name}</p>
                  <p className="text-sm text-gray-500">
                    {formatBytes(file.file_size)} - {file.is_public ? 'Public' : 'Private'}
                  </p>
                </div>
                <div className="space-x-2">
                  <button 
                    onClick={() => handleFileView(file)} 
                    className="text-green-600 hover:underline"
                    title="View file"
                  >
                    View
                  </button>
                  <button 
                    onClick={() => handleDownload(file)} 
                    className="text-blue-600 hover:underline"
                    title="Download file"
                  >
                    Download
                  </button>
                  <button 
                    onClick={() => handleDelete(file.id)} 
                    className="text-red-600 hover:underline"
                    title="Delete file"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {files.length === 0 && !loading && <p>No files for this project yet.</p>}
            {loading && <p>Loading files...</p>}
          </div>
        </div>
      </div>

      {/* File Viewer Modal */}
      <FileViewer
        file={viewingFile}
        isOpen={showFileViewer}
        onClose={handleCloseViewer}
        onDownload={handleDownload}
        onDelete={handleFileDelete}
      />
    </div>
  );
};

export default ProjectFilesModal; 