'use client';

import { useState, FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';

interface Comment {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
}

interface CommentSectionProps {
  postId: string;
  initialComments: Comment[];
}

export default function CommentSection({ postId, initialComments }: CommentSectionProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [content, setContent] = useState('');
  const [website, setWebsite] = useState(''); // Honeypot field
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: authorName.trim(),
          authorEmail: authorEmail.trim() || undefined,
          content: content.trim(),
          postId,
          website, // Honeypot — should be empty for real users
        }),
      });

      if (res.status === 429) {
        setFeedback({ type: 'error', message: 'Please wait before posting another comment.' });
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to post comment. Please try again.',
        });
        return;
      }

      const data = await res.json();

      // Optimistically add the new comment to the top of the list
      setComments((prev) => [data.comment, ...prev]);
      setAuthorName('');
      setAuthorEmail('');
      setContent('');
      setFeedback({ type: 'success', message: 'Comment posted successfully!' });
    } catch {
      setFeedback({ type: 'error', message: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (res.status === 204 || res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setFeedback({ type: 'success', message: 'Comment deleted.' });
      } else {
        setFeedback({ type: 'error', message: 'Failed to delete comment.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'An unexpected error occurred.' });
    }
  }

  return (
    <section className="mt-12 border-t border-gray-200 pt-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Comments {comments.length > 0 && `(${comments.length})`}
      </h2>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`mb-6 rounded-lg px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
          role="alert"
        >
          {feedback.message}
        </div>
      )}

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="mb-8 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="comment-name" className="block text-sm font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="comment-name"
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              required
              maxLength={100}
              placeholder="Your name"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="comment-email" className="block text-sm font-medium text-gray-700">
              Email <span className="text-gray-400 text-xs">(optional, not displayed)</span>
            </label>
            <input
              id="comment-email"
              type="email"
              value={authorEmail}
              onChange={(e) => setAuthorEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Honeypot field — hidden from real users via CSS, bots fill it */}
        <div className="absolute opacity-0 top-0 left-0 h-0 w-0 -z-10" aria-hidden="true">
          <label htmlFor="comment-website">Website</label>
          <input
            id="comment-website"
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="comment-content" className="block text-sm font-medium text-gray-700">
            Comment <span className="text-red-500">*</span>
          </label>
          <textarea
            id="comment-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            maxLength={5000}
            rows={4}
            placeholder="Write your comment..."
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-vertical"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Posting...
            </>
          ) : (
            'Post Comment'
          )}
        </button>
      </form>

      {/* Comment List */}
      {comments.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No comments yet. Be the first to share your thoughts!
        </p>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <article
              key={comment.id}
              className="rounded-lg border border-gray-200 bg-white p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {/* Avatar placeholder */}
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
                    {comment.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {comment.authorName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(comment.createdAt), 'MMM d, yyyy \'at\' h:mm a')}
                    </p>
                  </div>
                </div>
                {session?.user && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="text-xs text-red-500 hover:text-red-700 transition-colors"
                    title="Delete comment"
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="mt-3 text-gray-700 leading-relaxed whitespace-pre-wrap">
                {comment.content}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
