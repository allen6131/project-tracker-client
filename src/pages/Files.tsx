import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Project, ProjectFile, ProjectFolder } from '../types';
import { projectsAPI, filesAPI, foldersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import FileViewer from '../components/FileViewer';

const Files: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [folders, setFolders] = useState<ProjectFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<ProjectFolder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [showUploadArea, setShowUploadArea] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  
  // File viewer state
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [viewingFile, setViewingFile] = useState<ProjectFile | null>(null);

  const loadProject = useCallback(async () => {
    if (!id) return;
    try {
      const response = await projectsAPI.getProject(parseInt(id));
      setProject(response.project);
    } catch (err: any) {
      setError('Failed to load project');
    }
  }, [id]);

  const loadFiles = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await filesAPI.getProjectFiles(parseInt(id));
      setFiles(response.files);
    } catch (err: any) {
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadFolders = useCallback(async () => {
    if (!id) return;
    try {
      const response = await foldersAPI.getProjectFolders(parseInt(id));
      setFolders(response.folders);
    } catch (err: any) {
      setError('Failed to load folders');
    }
  }, [id]);

  const handleCreateFolder = async () => {
    if (!id || !newFolderName.trim()) return;
    
    try {
      await foldersAPI.createFolder(parseInt(id), newFolderName.trim());
      setNewFolderName('');
      setShowCreateFolder(false);
      loadFolders();
    } catch (err: any) {
      setError('Failed to create folder');
    }
  };

  const handleDeleteFolder = async (folderId: number) => {
    if (!id || !window.confirm('Are you sure you want to delete this folder?')) return;
    
    try {
      await foldersAPI.deleteFolder(parseInt(id), folderId);
      loadFolders();
      // If the deleted folder was selected, clear selection
      if (selectedFolder?.id === folderId) {
        setSelectedFolder(null);
      }
    } catch (err: any) {
      setError('Failed to delete folder');
    }
  };

  useEffect(() => {
    loadProject();
    loadFiles();
    loadFolders();
  }, [loadProject, loadFiles, loadFolders]);

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.original_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFolder = selectedFolder ? file.folder_id === selectedFolder.id : file.folder_id === null;
    return matchesSearch && matchesFolder;
  });

  const handleFileUpload = async (fileList: FileList) => {
    if (!id) return;
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const fileKey = `${file.name}-${Date.now()}`;
      
      try {
        setUploadProgress(prev => ({ ...prev, [fileKey]: 0 }));
        await filesAPI.uploadFile(parseInt(id), file, true, selectedFolder?.id);
        setUploadProgress(prev => ({ ...prev, [fileKey]: 100 }));
        
        // Remove progress after a delay
        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileKey];
            return newProgress;
          });
        }, 2000);
        
      } catch (err) {
        setError(`Failed to upload ${file.name}`);
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[fileKey];
          return newProgress;
        });
      }
    }
    
    loadFiles();
    setShowUploadArea(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileUpload(e.target.files);
    }
  };

  const handleDelete = async (fileIds: number[]) => {
    if (!window.confirm(`Delete ${fileIds.length === 1 ? 'this file' : 'these files'}?`)) return;
    
    try {
      await Promise.all(fileIds.map(id => filesAPI.deleteFile(id)));
      loadFiles();
      setSelectedFiles(new Set());
    } catch (err) {
      setError('Failed to delete files');
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
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download file');
    }
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

  const getFileIcon = (fileName: string, fileType: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (fileType?.startsWith('image/')) return '🖼️';
    if (fileType?.startsWith('video/')) return '🎥';
    if (fileType?.startsWith('audio/')) return '🎵';
    if (fileType?.includes('pdf')) return '📄';
    if (fileType?.includes('word') || extension === 'doc' || extension === 'docx') return '📝';
    if (fileType?.includes('excel') || extension === 'xls' || extension === 'xlsx') return '📊';
    if (fileType?.includes('powerpoint') || extension === 'ppt' || extension === 'pptx') return '📺';
    if (extension === 'zip' || extension === 'rar' || extension === '7z') return '🗜️';
    if (extension === 'txt' || extension === 'md') return '📋';
    if (extension === 'js' || extension === 'ts' || extension === 'json' || extension === 'html' || extension === 'css') return '💻';
    
    return '📁';
  };

  const toggleFileSelection = (fileId: number, event?: React.MouseEvent) => {
    // Prevent toggling selection if clicking on action buttons
    if (event && (event.target as HTMLElement).closest('button')) {
      return;
    }
    
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
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
    handleDelete([file.id]);
    handleCloseViewer();
  };

  const isImage = (fileType: string) => fileType?.startsWith('image/');

  if (!project) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link 
                to={`/projects/${id}`}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Project
              </Link>
              <div className="text-gray-300">|</div>
              <h1 className="text-xl font-semibold text-gray-900">{project.name} Files</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <svg className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                />
              </div>
              
              {/* View Toggle */}
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              
              {/* Upload Button */}
              <button
                onClick={() => setShowUploadArea(!showUploadArea)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Upload</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {/* Folder Navigation */}
        <div className="mb-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Folders</h2>
            {isAdmin && (
              <button
                onClick={() => setShowCreateFolder(true)}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>New Folder</span>
              </button>
            )}
          </div>
          <div className="p-4">
            {/* All Files Option */}
            <div
              className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer mb-2 ${
                !selectedFolder ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelectedFolder(null)}
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-medium text-gray-900">All Files</span>
              <span className="text-gray-500 text-sm">({files.filter(f => !f.folder_id).length})</span>
            </div>
            
            {/* Folder List */}
            <div className="space-y-1">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer ${
                    selectedFolder?.id === folder.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedFolder(folder)}
                >
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                  <span className="font-medium text-gray-900 flex-1">{folder.name}</span>
                  <span className="text-gray-500 text-sm">({files.filter(f => f.folder_id === folder.id).length})</span>
                  {folder.is_default && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Default</span>
                  )}
                  {isAdmin && !folder.is_default && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(folder.id);
                      }}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Delete folder"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Create Folder Form */}
            {showCreateFolder && (
              <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Create New Folder</h3>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    placeholder="Folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                  />
                  <button
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateFolder(false);
                      setNewFolderName('');
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upload Area */}
        {showUploadArea && (
          <div className="mb-6">
            {selectedFolder && (
              <div className="mb-3 text-sm text-gray-600 flex items-center space-x-2">
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                <span>Files will be uploaded to: <strong>{selectedFolder.name}</strong></span>
              </div>
            )}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 bg-gray-50 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-xl mb-2 text-gray-600">Drop files here to upload</p>
              <p className="text-gray-500 mb-4">or</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50"
              >
                Browse Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
            
            {/* Upload Progress */}
            {Object.keys(uploadProgress).length > 0 && (
              <div className="mt-4 space-y-2">
                {Object.entries(uploadProgress).map(([fileKey, progress]) => (
                  <div key={fileKey} className="bg-white p-3 rounded-lg border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">{fileKey.split('-')[0]}</span>
                      <span className="text-sm text-gray-500">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions Bar */}
        {selectedFiles.size > 0 && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <span className="text-blue-800">
              {selectedFiles.size} file{selectedFiles.size !== 1 ? 's' : ''} selected
            </span>
            <div className="space-x-2">
              <button
                onClick={() => handleDelete(Array.from(selectedFiles))}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Delete Selected
              </button>
              <button
                onClick={() => setSelectedFiles(new Set())}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Help Text */}
        {filteredFiles.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-blue-800 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                <strong>Tip:</strong> Click the View button or double-click any file to preview it in your browser. 
                Single-click to select files for bulk operations.
              </span>
            </div>
          </div>
        )}

        {/* Files Display */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading files...</span>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No files yet</h3>
            <p className="text-gray-500 mb-4">Upload your first file to get started</p>
            <button
              onClick={() => setShowUploadArea(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Upload Files
            </button>
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
              : 'space-y-1'
          }>
            {filteredFiles.map((file) => (
              viewMode === 'grid' ? (
                <div
                  key={file.id}
                  className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedFiles.has(file.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={(e) => toggleFileSelection(file.id, e)}
                  onDoubleClick={() => handleFileView(file)}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-2">
                      {isImage(file.file_type) ? (
                        <div className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">🖼️</span>
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          {getFileIcon(file.original_name, file.file_type)}
                        </div>
                      )}
                    </div>
                    <h3 className="font-medium text-sm text-gray-900 truncate" title={file.original_name}>
                      {file.original_name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatBytes(file.file_size)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(file.created_at)}
                    </p>
                  </div>
                  <div className="mt-3 flex justify-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFileView(file);
                      }}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                      title="View file"
                    >
                      View
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(file);
                      }}
                      className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
                      title="Download file"
                    >
                      Download
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete([file.id]);
                      }}
                      className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                      title="Delete file"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  key={file.id}
                  className={`bg-white rounded border p-4 cursor-pointer transition-all hover:shadow-sm flex items-center justify-between ${
                    selectedFiles.has(file.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={(e) => toggleFileSelection(file.id, e)}
                  onDoubleClick={() => handleFileView(file)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">
                      {getFileIcon(file.original_name, file.file_type)}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{file.original_name}</h3>
                      <p className="text-sm text-gray-500">
                        {formatBytes(file.file_size)} • {formatDate(file.created_at)} • {file.is_public ? 'Public' : 'Private'}
                        {file.folder_name && (
                          <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                            📁 {file.folder_name}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFileView(file);
                      }}
                      className="text-green-600 hover:text-green-800 p-2"
                      title="View file"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(file);
                      }}
                      className="text-blue-600 hover:text-blue-800 p-2"
                      title="Download"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete([file.id]);
                      }}
                      className="text-red-600 hover:text-red-800 p-2"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            ))}
          </div>
        )}
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

export default Files; 