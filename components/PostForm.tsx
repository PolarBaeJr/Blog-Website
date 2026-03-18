'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';

/** Lazy-load TiptapEditor to reduce initial bundle size */
const TiptapEditor = dynamic(() => import('./TiptapEditor'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[400px] rounded-lg border border-gray-300 bg-gray-50 flex items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
    </div>
  ),
});

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface PostData {
  id: string;
  title: string;
  content: string;
  excerpt?: string | null;
  coverImage?: string | null;
  published: boolean;
  categoryId?: string | null;
  tags?: Tag[];
}

interface PostFormProps {
  post?: PostData;
  onSuccess: () => void;
}

/**
 * Post creation/editing form with Tiptap rich text editor.
 * Fetches tags and categories from API on mount.
 * Handles cover image upload and tag/category selection.
 */
export default function PostForm({ post, onSuccess }: PostFormProps) {
  const isEditing = !!post;

  // Form state
  const [title, setTitle] = useState(post?.title || '');
  const [content, setContent] = useState(post?.content || '');
  const [excerpt, setExcerpt] = useState(post?.excerpt || '');
  const [coverImage, setCoverImage] = useState(post?.coverImage || '');
  const [published, setPublished] = useState(post?.published || false);
  const [categoryId, setCategoryId] = useState(post?.categoryId || '');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    post?.tags?.map((t) => t.id) || []
  );

  // Data from API
  const [tags, setTags] = useState<Tag[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // UI state
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch tags and categories on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const [tagsRes, catsRes] = await Promise.all([
          fetch('/api/tags'),
          fetch('/api/categories'),
        ]);

        if (tagsRes.ok) {
          const data = await tagsRes.json();
          setTags(data.tags || []);
        }
        if (catsRes.ok) {
          const data = await catsRes.json();
          setCategories(data.categories || []);
        }
      } catch {
        console.error('Failed to fetch tags/categories');
      }
    }
    fetchData();
  }, []);

  // Handle cover image upload
  const handleCoverUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';
    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to upload cover image');
        return;
      }

      const { url } = await res.json();
      setCoverImage(url);
    } catch {
      setError('Failed to upload cover image. Please try again.');
    } finally {
      setUploading(false);
    }
  }, []);

  // Handle tag toggle
  const toggleTag = useCallback((tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const body = {
        title,
        content,
        excerpt: excerpt || undefined,
        coverImage: coverImage || undefined,
        published,
        categoryId: categoryId || undefined,
        tagIds: selectedTagIds,
      };

      const url = isEditing ? `/api/posts/${post.id}` : '/api/posts';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save post');
        return;
      }

      setSuccess(isEditing ? 'Post updated successfully!' : 'Post created successfully!');
      setTimeout(() => onSuccess(), 1000);
    } catch {
      setError('Failed to save post. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error/Success messages */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 border border-green-200 p-4">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
          placeholder="Enter post title..."
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-lg font-medium text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Content (Tiptap Editor) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Content <span className="text-red-500">*</span>
        </label>
        <TiptapEditor content={content} onChange={setContent} />
      </div>

      {/* Excerpt */}
      <div>
        <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-1">
          Excerpt
        </label>
        <textarea
          id="excerpt"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Brief summary of the post (optional)..."
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-vertical"
        />
        <p className="mt-1 text-xs text-gray-500">{excerpt.length}/500 characters</p>
      </div>

      {/* Cover Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cover Image
        </label>
        {coverImage && (
          <div className="relative mb-3 inline-block">
            <Image
              src={coverImage}
              alt="Cover preview"
              width={400}
              height={200}
              className="rounded-lg border border-gray-200 object-cover"
            />
            <button
              type="button"
              onClick={() => setCoverImage('')}
              className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow hover:bg-red-600"
              title="Remove cover image"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex items-center gap-3">
          <label className="cursor-pointer rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            {uploading ? 'Uploading...' : coverImage ? 'Change Image' : 'Upload Image'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleCoverUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
          {uploading && (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          )}
        </div>
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
          Category
        </label>
        <select
          id="category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">No category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
        <div className="flex flex-wrap gap-2">
          {tags.length === 0 && (
            <p className="text-sm text-gray-500">No tags available. Create tags in Settings.</p>
          )}
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                selectedTagIds.includes(tag.id)
                  ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      {/* Published Toggle */}
      <div className="flex items-center gap-3">
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="peer sr-only"
          />
          <div className="h-6 w-11 rounded-full bg-gray-300 peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:after:translate-x-5" />
        </label>
        <span className="text-sm font-medium text-gray-700">
          {published ? 'Published' : 'Draft'}
        </span>
      </div>

      {/* Submit Button */}
      <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={saving || !title.trim() || !content.trim()}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : isEditing ? 'Update Post' : 'Create Post'}
        </button>
        {saving && (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        )}
      </div>
    </form>
  );
}
