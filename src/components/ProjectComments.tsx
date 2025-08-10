import React, { useState, useEffect, useRef } from 'react';
import { ProjectComment, CreateCommentRequest, User } from '../types';
import api from '../services/api';
import { commentsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface ProjectCommentsProps {
  projectId: number;
}

const ProjectComments: React.FC<ProjectCommentsProps> = ({ projectId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<ProjectComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [mentionableUsers, setMentionableUsers] = useState<User[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedMentions, setSelectedMentions] = useState<number[]>([]);
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadComments();
    loadMentionableUsers();
  }, [projectId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const response = await commentsAPI.getProjectComments(projectId);
      setComments(response.comments);
      setError(null);
    } catch (error: any) {
      console.error('Error loading comments:', error);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const loadMentionableUsers = async () => {
    try {
      const response = await commentsAPI.getMentionableUsers(projectId);
      setMentionableUsers(response.users);
    } catch (error) {
      console.error('Error loading mentionable users:', error);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const position = e.target.selectionStart || 0;
    
    setNewComment(value);
    setCursorPosition(position);
    
    // Check for @ mentions
    const beforeCursor = value.slice(0, position);
    const mentionMatch = beforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMentions(true);
    } else {
      setShowMentions(false);
      setMentionQuery('');
    }
  };

  const handleMentionSelect = (user: User) => {
    const beforeCursor = newComment.slice(0, cursorPosition);
    const afterCursor = newComment.slice(cursorPosition);
    
    // Find the @ symbol position
    const mentionStartIndex = beforeCursor.lastIndexOf('@');
    if (mentionStartIndex !== -1) {
      const newValue = 
        beforeCursor.slice(0, mentionStartIndex) + 
        `@${user.username} ` + 
        afterCursor;
      
      setNewComment(newValue);
      setSelectedMentions([...selectedMentions, user.id]);
      setShowMentions(false);
      setMentionQuery('');
      
      // Focus back on textarea
      setTimeout(() => {
        if (textareaRef.current) {
          const newPosition = mentionStartIndex + user.username.length + 2;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newPosition, newPosition);
        }
      }, 0);
    }
  };

  const extractMentionsFromText = (text: string): number[] => {
    const mentionMatches = text.match(/@(\w+)/g) || [];
    const mentionedUserIds: number[] = [];
    
    mentionMatches.forEach(mention => {
      const username = mention.slice(1); // Remove @
      const user = mentionableUsers.find(u => u.username === username);
      if (user && !mentionedUserIds.includes(user.id)) {
        mentionedUserIds.push(user.id);
      }
    });
    
    return mentionedUserIds;
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) {
      setError('Please enter a comment');
      return;
    }

    try {
      clearMessages();
      const mentions = extractMentionsFromText(newComment);
      
      const commentData: CreateCommentRequest = {
        content: newComment.trim(),
        mentions
      };

      await commentsAPI.createComment(projectId, commentData);
      setNewComment('');
      setSelectedMentions([]);
      await loadComments();
      setSuccess('Comment added successfully');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error creating comment:', error);
      setError(error.response?.data?.message || 'Failed to create comment');
    }
  };

  const handleEditComment = (comment: ProjectComment) => {
    setEditingComment(comment.id);
    setEditingContent(comment.content);
  };

  const handleUpdateComment = async (commentId: number) => {
    if (!editingContent.trim()) {
      setError('Please enter comment content');
      return;
    }

    try {
      clearMessages();
      const mentions = extractMentionsFromText(editingContent);
      
      await commentsAPI.updateComment(commentId, {
        content: editingContent.trim(),
        mentions
      });
      
      setEditingComment(null);
      setEditingContent('');
      await loadComments();
      setSuccess('Comment updated successfully');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error updating comment:', error);
      setError(error.response?.data?.message || 'Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      clearMessages();
      await commentsAPI.deleteComment(commentId);
      await loadComments();
      setSuccess('Comment deleted successfully');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      setError(error.response?.data?.message || 'Failed to delete comment');
    }
  };

  const canEditComment = (comment: ProjectComment) => {
    return comment.user_id === user?.id;
  };

  const canDeleteComment = (comment: ProjectComment) => {
    return comment.user_id === user?.id || user?.role === 'admin';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else if (diffInHours < 168) { // 7 days
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderCommentContent = (content: string) => {
    // Replace @mentions with highlighted spans
    return content.replace(/@(\w+)/g, '<span class="bg-blue-100 text-blue-800 px-1 rounded">@$1</span>');
  };

  const filteredMentionUsers = mentionableUsers.filter(user =>
    user.username.toLowerCase().includes(mentionQuery.toLowerCase()) &&
    user.id !== user?.id // Don't suggest mentioning yourself
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Comments ({comments.length})
      </h3>

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* New Comment Form */}
      <form onSubmit={handleSubmitComment} className="mb-6">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={handleCommentChange}
            placeholder="Write a comment... Use @ to mention users"
            className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
          
          {/* Mention Dropdown */}
          {showMentions && filteredMentionUsers.length > 0 && (
            <div className="absolute z-10 w-64 bg-white border border-gray-300 rounded-md shadow-lg mt-1">
              {filteredMentionUsers.slice(0, 5).map(user => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleMentionSelect(user)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center space-x-2"
                >
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{user.username}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="mt-3 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Type @ to mention users
          </div>
          <button
            type="submit"
            disabled={!newComment.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Post Comment
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="border-l-2 border-gray-200 pl-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {comment.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{comment.username}</span>
                      <span className={`px-2 py-1 text-xs rounded ${
                        comment.role === 'admin' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {comment.role}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span>{formatDate(comment.created_at)}</span>
                      {comment.is_edited && (
                        <span className="italic">(edited)</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {canEditComment(comment) && (
                    <button
                      onClick={() => handleEditComment(comment)}
                      className="text-gray-400 hover:text-blue-600 text-sm"
                    >
                      Edit
                    </button>
                  )}
                  {canDeleteComment(comment) && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-gray-400 hover:text-red-600 text-sm"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              
              <div className="mt-2 ml-10">
                {editingComment === comment.id ? (
                  <div className="space-y-2">
                    <textarea
                      ref={editTextareaRef}
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleUpdateComment(comment.id)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingComment(null);
                          setEditingContent('');
                        }}
                        className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="text-gray-700 whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: renderCommentContent(comment.content) }}
                  />
                )}
                
                {/* Show mentioned users */}
                {comment.mentioned_users && comment.mentioned_users.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {comment.mentioned_users.map(mentionedUser => (
                      <span
                        key={mentionedUser.id}
                        className="inline-flex items-center px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full"
                      >
                        @{mentionedUser.username}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProjectComments; 