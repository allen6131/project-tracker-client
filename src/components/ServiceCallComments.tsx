import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { serviceCallsAPI } from '../services/api';
import { ServiceCallComment, CreateServiceCallCommentRequest, UpdateServiceCallCommentRequest, User } from '../types';

interface ServiceCallCommentsProps {
  serviceCallId: number;
}

const ServiceCallComments: React.FC<ServiceCallCommentsProps> = ({ serviceCallId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<ServiceCallComment[]>([]);
  const [mentionableUsers, setMentionableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Comment form state
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedMentions, setSelectedMentions] = useState<User[]>([]);
  
  // Edit state
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editMentions, setEditMentions] = useState<User[]>([]);

  useEffect(() => {
    loadComments();
    loadMentionableUsers();
  }, [serviceCallId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const response = await serviceCallsAPI.getServiceCallComments(serviceCallId);
      setComments(response.comments);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const loadMentionableUsers = async () => {
    try {
      const response = await serviceCallsAPI.getServiceCallMentionableUsers(serviceCallId);
      setMentionableUsers(response.users);
    } catch (err) {
      console.error('Failed to load mentionable users:', err);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    try {
      setSubmitting(true);
      setError(null);

      const commentData: CreateServiceCallCommentRequest = {
        content: newComment.trim(),
        mentions: selectedMentions.map(u => u.id)
      };

      await serviceCallsAPI.createServiceCallComment(serviceCallId, commentData);
      setNewComment('');
      setSelectedMentions([]);
      setSuccess('Comment added successfully');
      loadComments();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: number) => {
    if (!editContent.trim()) return;

    try {
      const updateData: UpdateServiceCallCommentRequest = {
        content: editContent.trim(),
        mentions: editMentions.map(u => u.id)
      };

      await serviceCallsAPI.updateServiceCallComment(commentId, updateData);
      setEditingComment(null);
      setEditContent('');
      setEditMentions([]);
      setSuccess('Comment updated successfully');
      loadComments();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await serviceCallsAPI.deleteServiceCallComment(commentId);
      setSuccess('Comment deleted successfully');
      loadComments();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete comment');
    }
  };

  const startEditing = (comment: ServiceCallComment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
    // Convert MentionedUser[] to User[] by adding default role
    setEditMentions(comment.mentioned_users.map(user => ({
      ...user,
      role: user.role || 'user' as 'admin' | 'user',
      is_active: true // Add required field for User type
    })));
  };

  const cancelEditing = () => {
    setEditingComment(null);
    setEditContent('');
    setEditMentions([]);
  };

  const handleMentionSelect = (selectedUser: User, isEdit = false) => {
    if (isEdit) {
      if (!editMentions.find(u => u.id === selectedUser.id)) {
        setEditMentions([...editMentions, selectedUser]);
      }
    } else {
      if (!selectedMentions.find(u => u.id === selectedUser.id)) {
        setSelectedMentions([...selectedMentions, selectedUser]);
      }
    }
    setMentionQuery('');
    setShowMentions(false);
  };

  const removeMention = (userId: number, isEdit = false) => {
    if (isEdit) {
      setEditMentions(editMentions.filter(u => u.id !== userId));
    } else {
      setSelectedMentions(selectedMentions.filter(u => u.id !== userId));
    }
  };

  const filteredUsers = mentionableUsers.filter(u => 
    u.username.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error and Success Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-200 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* New Comment Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <form onSubmit={handleSubmitComment} className="space-y-4">
          <div>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          {/* Mentions */}
          <div className="relative">
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedMentions.map(user => (
                <span
                  key={user.id}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                >
                  @{user.username}
                  <button
                    type="button"
                    onClick={() => removeMention(user.id)}
                    className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={mentionQuery}
                onChange={(e) => setMentionQuery(e.target.value)}
                onFocus={() => setShowMentions(true)}
                placeholder="@mention users..."
                className="flex-1 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Mention Dropdown */}
            {showMentions && mentionQuery && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-40 overflow-y-auto z-10">
                {filteredUsers.map(user => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleMentionSelect(user)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                  >
                    <span className="font-medium">{user.username}</span>
                    <span className="text-gray-500 ml-2">({user.email})</span>
                  </button>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">No users found</div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setNewComment('');
                setSelectedMentions([]);
                setShowMentions(false);
              }}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Adding...' : 'Add Comment'}
            </button>
          </div>
        </form>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No comments yet. Be the first to add one!</p>
          </div>
        ) : (
          comments.map(comment => (
            <div
              key={comment.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {comment.username.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {comment.username}
                      </span>
                      {comment.role === 'admin' && (
                        <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full">
                          Admin
                        </span>
                      )}
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(comment.created_at)}
                        {comment.is_edited && (
                          <span className="ml-1 text-xs">(edited)</span>
                        )}
                      </span>
                    </div>

                    {/* Comment Content */}
                    {editingComment === comment.id ? (
                      <div className="mt-2 space-y-3">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        
                        {/* Edit Mentions */}
                        <div className="flex flex-wrap gap-2">
                          {editMentions.map(user => (
                            <span
                              key={user.id}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            >
                              @{user.username}
                              <button
                                type="button"
                                onClick={() => removeMention(user.id, true)}
                                className="ml-1 text-blue-600 hover:text-blue-800"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>

                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={cancelEditing}
                            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleEditComment(comment.id)}
                            disabled={!editContent.trim()}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {comment.content}
                        </p>
                        
                        {/* Mentioned Users */}
                        {comment.mentioned_users && comment.mentioned_users.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {comment.mentioned_users.map(mentionedUser => (
                              <span
                                key={mentionedUser.id}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                              >
                                @{mentionedUser.username}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Comment Actions */}
                {editingComment !== comment.id && (
                  <div className="flex items-center space-x-2 ml-4">
                    {(user?.userId === comment.user_id) && (
                      <button
                        onClick={() => startEditing(comment)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title="Edit comment"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                    {(user?.userId === comment.user_id || user?.role === 'admin') && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-red-400 hover:text-red-600"
                        title="Delete comment"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
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

export default ServiceCallComments;
