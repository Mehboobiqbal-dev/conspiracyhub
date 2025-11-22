'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowUp, ArrowDown, Image as ImageIcon, Loader2, Paperclip, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { CommentSort } from './comment-sort';
import { CommentMenu } from './comment-menu';
import { uploadMedia } from '@/lib/uploads/client';

interface CommentAttachment {
  url: string;
  type: 'image' | 'video';
  altText?: string;
  caption?: string;
}

interface Comment {
  _id: string;
  authorId?: string;
  authorName?: string;
  authorAvatar?: string;
  content: string;
  attachment?: CommentAttachment;
  upvotes: number;
  downvotes: number;
  createdAt: Date;
  isEdited?: boolean;
  replies?: Comment[];
}

interface CommentSectionProps {
  postId: string;
  postSlug: string;
}

export function CommentSection({ postId, postSlug }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [attachment, setAttachment] = useState<CommentAttachment | null>(null);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [sort, setSort] = useState('best');
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchComments();
  }, [postId, sort]);

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/posts/${postSlug}/comments?sort=${sort}`);
      const data = await response.json();
      
      // Sort comments based on selected option
      let sortedComments = [...(data.comments || [])];
      
      switch (sort) {
        case 'best':
          // Best = high upvotes, low downvotes, recent
          sortedComments.sort((a, b) => {
            const scoreA = a.upvotes - a.downvotes;
            const scoreB = b.upvotes - b.downvotes;
            if (scoreA !== scoreB) return scoreB - scoreA;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
          break;
        case 'top':
          sortedComments.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
          break;
        case 'new':
          sortedComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
        case 'old':
          sortedComments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          break;
        case 'controversial':
          sortedComments.sort((a, b) => {
            const totalA = a.upvotes + a.downvotes;
            const totalB = b.upvotes + b.downvotes;
            const diffA = Math.abs(a.upvotes - a.downvotes);
            const diffB = Math.abs(b.upvotes - b.downvotes);
            return (totalB - diffB) - (totalA - diffA);
          });
          break;
      }
      
      setComments(sortedComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to comment',
        variant: 'destructive',
      });
      router.push(`/login?redirect=/p/${postSlug}`);
      return;
    }

    if (!newComment.trim()) {
      return;
    }

    setSubmitting(true);

    try {
      const { authenticatedFetch } = await import('@/lib/auth/fetch');
      const response = await authenticatedFetch('/api/comments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          content: newComment,
          attachment: attachment
            ? {
                url: attachment.url,
                type: attachment.type,
                altText: attachment.altText,
                caption: attachment.caption,
              }
            : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create comment');
      }

      setNewComment('');
      setAttachment(null);
      toast({
        title: 'Success',
        description: 'Comment posted!',
      });
      fetchComments();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to post comment';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAttachmentUpload = async (file?: File) => {
    if (!file) return;
    setAttachmentUploading(true);
    try {
      const result = await uploadMedia(file, 'image');
      const altText = window.prompt('Alt text for accessibility (optional)') || undefined;
      const caption = window.prompt('Caption (optional)') || undefined;
      setAttachment({
        url: result.url,
        type: 'image',
        altText,
        caption,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload media';
      toast({
        title: 'Upload error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setAttachmentUploading(false);
    }
  };

  const handleSelectAttachment = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event) => handleAttachmentUpload((event.target as HTMLInputElement).files?.[0]);
    input.click();
  };

  const handleAttachmentRemove = () => {
    setAttachment(null);
  };

  const handleVote = async (commentId: string, type: 'upvote' | 'downvote') => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to vote',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          commentId,
          type,
        }),
      });

      if (response.ok) {
        fetchComments();
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading comments...</div>;
  }

  return (
    <div className="space-y-6">
      {user && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                rows={4}
                disabled={submitting}
              />
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAttachment}
                    disabled={attachmentUploading}
                  >
                    {attachmentUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Paperclip className="h-4 w-4 mr-2" />
                        Attach image
                      </>
                    )}
                  </Button>
                  {attachment && (
                    <div className="flex items-center gap-3 border rounded-lg p-2">
                      <div className="relative h-16 w-20 overflow-hidden rounded-md bg-muted">
                        <Image
                          src={attachment.url}
                          alt={attachment.altText || 'Comment attachment'}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Image attached</p>
                        {attachment.caption && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {attachment.caption}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleAttachmentRemove}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Attach supporting screenshots or memes (5MB limit). Media uses the same signed upload
                  pipeline as posts for speed and safety.
                </p>
              </div>
              <Button type="submit" disabled={submitting || !newComment.trim()}>
                {submitting ? 'Posting...' : 'Post Comment'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {comments.length > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{comments.length} Comments</h3>
          <CommentSort value={sort} onValueChange={setSort} />
        </div>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment._id}
              comment={comment}
              onVote={handleVote}
              user={user}
              onRefresh={fetchComments}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  onVote,
  user,
  onRefresh,
}: {
  comment: Comment;
  onVote: (id: string, type: 'upvote' | 'downvote') => void;
  user: any;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const handleEdit = async () => {
    try {
      const response = await fetch(`/api/comments/${comment._id}/edit`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ content: editContent }),
      });

      if (!response.ok) {
        throw new Error('Failed to update comment');
      }

      toast({
        title: 'Success',
        description: 'Comment updated',
      });
      setEditing(false);
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update comment',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/comments/${comment._id}/delete`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      toast({
        title: 'Success',
        description: 'Comment deleted',
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete comment',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const isAuthor = user && comment.authorId === user.id;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex gap-4">
          <div className="flex flex-col items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onVote(comment._id, 'upvote')}
              disabled={!user}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{comment.upvotes - comment.downvotes}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onVote(comment._id, 'downvote')}
              disabled={!user}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{comment.authorName || 'Anonymous'}</span>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </span>
                {comment.isEdited && (
                  <span className="text-xs text-muted-foreground">(edited)</span>
                )}
              </div>
              {isAuthor && !editing && (
                <CommentMenu
                  commentId={comment._id}
                  authorId={comment.authorId}
                  onEdit={() => setEditing(true)}
                  onDelete={handleDelete}
                />
              )}
            </div>
            {editing ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={4}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleEdit}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setEditing(false);
                    setEditContent(comment.content);
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm whitespace-pre-wrap mb-2">{comment.content}</p>
                {comment.attachment && (
                  <CommentAttachmentBlock attachment={comment.attachment} />
                )}
              </>
            )}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-4 ml-4 space-y-2 border-l-2 pl-4">
                {comment.replies.map((reply) => (
                  <div key={reply._id} className="text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{reply.authorName || 'Anonymous'}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap mb-1">{reply.content}</p>
                    {reply.attachment && (
                      <CommentAttachmentBlock attachment={reply.attachment} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CommentAttachmentBlock({ attachment }: { attachment: CommentAttachment }) {
  if (attachment.type !== 'image') return null;

  return (
    <div className="mb-2">
      <div className="relative h-60 w-full overflow-hidden rounded-lg border bg-muted">
        <Image
          src={attachment.url}
          alt={attachment.altText || 'Comment attachment'}
          fill
          sizes="(max-width: 768px) 100vw, 600px"
          className="object-cover"
        />
      </div>
      {attachment.caption && (
        <p className="text-xs text-muted-foreground mt-1">{attachment.caption}</p>
      )}
    </div>
  );
}

