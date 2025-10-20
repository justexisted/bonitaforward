import { useRef, useState, useEffect } from 'react'
import { 
  upsertBlogPost, 
  deleteBlogPost, 
  fetchAllBlogPosts, 
  uploadBlogImage, 
  deleteBlogImage,
  type BlogPost 
} from '../../../lib/supabaseData'

/**
 * BLOG SECTION
 * 
 * Step 10 of gradual Admin.tsx extraction (Phase 3)
 * Complete blog post management system with rich text editor.
 * 
 * Features:
 * - Rich text editor with formatting (bold, italic, underline, sizes)
 * - Category selection for blog posts
 * - Image upload and management
 * - Emoji picker
 * - Edit existing posts
 * - Delete posts
 * - Post list sidebar
 * 
 * This is a self-contained section with its own state management.
 */

interface BlogDraft {
  id?: string
  category_key: string
  title: string
  content: string
  images?: string[]
}

interface BlogSectionProps {
  onMessage: (msg: string) => void
  onError: (err: string) => void
}

// Emoji list
const EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊',
  '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪',
  '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏',
  '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
  '🤢', '🤮', '🤧', '🥵', '🥶', '😶‍🌫️', '🥴', '😵', '🤯', '🤠', '🥳', '😎',
  '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦',
  '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩',
  '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡',
  '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽',
  '🙀', '😿', '😾', '💋', '👋', '🤚', '🖐', '✋', '🖖', '👌', '🤏', '✌️',
  '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎',
  '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅',
  '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴',
  '👀', '👁', '👅', '👄', '💘', '💝', '💖', '💗', '💓', '💞', '💕', '💟',
  '❣️', '💔', '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💯',
  '💢', '💥', '💫', '💦', '💨', '🕳', '💬', '👁️‍🗨️', '🗨', '🗯', '💭', '💤'
]

export function BlogSection({ onMessage, onError }: BlogSectionProps) {
  // Blog state
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [blogDraft, setBlogDraft] = useState<BlogDraft>({
    category_key: 'restaurants-cafes',
    title: '',
    content: '',
    images: []
  })
  
  // Editor state
  const editorRef = useRef<HTMLDivElement>(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [emojiQuery, setEmojiQuery] = useState('')

  // Load blog posts on mount
  useEffect(() => {
    loadBlogPosts()
  }, [])

  const loadBlogPosts = async () => {
    try {
      const posts = await fetchAllBlogPosts()
      setBlogPosts(posts)
    } catch (err: any) {
      console.error('Failed to load blog posts:', err)
      onError('Failed to load blog posts')
    }
  }

  // Filtered emojis based on search
  const filteredEmojis = emojiQuery.trim() === '' 
    ? EMOJIS 
    : EMOJIS.filter(() => true) // Keep all for now, could add emoji names later

  // Sync editor content to state
  const syncEditorToState = () => {
    if (editorRef.current) {
      setBlogDraft(prev => ({ ...prev, content: editorRef.current!.innerHTML }))
    }
  }

  // Apply formatting to selected text
  const applyFormat = (format: string) => {
    document.execCommand(format, false, undefined)
    syncEditorToState()
  }

  // Wrap selection with custom HTML
  const wrapSelectionWith = (tag: string, className?: string, style?: string) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    
    const range = selection.getRangeAt(0)
    const selectedText = range.toString()
    
    if (selectedText) {
      const wrapper = document.createElement(tag)
      if (className) wrapper.className = className
      if (style) wrapper.setAttribute('style', style)
      wrapper.textContent = selectedText
      
      range.deleteContents()
      range.insertNode(wrapper)
      
      syncEditorToState()
    }
  }

  // Clear formatting to normal
  const clearFormattingToNormal = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    
    const range = selection.getRangeAt(0)
    const selectedText = range.toString()
    
    if (selectedText) {
      range.deleteContents()
      range.insertNode(document.createTextNode(selectedText))
      syncEditorToState()
    }
  }

  // Insert emoji at cursor
  const insertEmoji = (emoji: string) => {
    if (editorRef.current) {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        range.insertNode(document.createTextNode(emoji))
        syncEditorToState()
      } else {
        editorRef.current.innerHTML += emoji
        syncEditorToState()
      }
    }
  }

  // Save blog post
  const handleSavePost = async () => {
    onError('')
    onMessage('')
    
    try {
      const { error } = await upsertBlogPost({
        id: blogDraft.id,
        category_key: blogDraft.category_key,
        title: blogDraft.title,
        content: blogDraft.content,
        images: blogDraft.images
      } as any)
      
      if (error) {
        onError(error)
      } else {
        onMessage('Blog post saved')
        await loadBlogPosts()
        setBlogDraft({
          category_key: blogDraft.category_key,
          title: '',
          content: '',
          images: []
        })
        if (editorRef.current) {
          editorRef.current.innerHTML = ''
        }
      }
    } catch (err: any) {
      onError(err.message || 'Failed to save blog post')
    }
  }

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    
    onMessage('Uploading images...')
    
    try {
      const uploadPromises = files.map(file => uploadBlogImage(file))
      const urls = await Promise.all(uploadPromises)
      const validUrls = urls.filter(url => url !== null) as string[]
      
      if (validUrls.length > 0) {
        setBlogDraft(prev => ({
          ...prev,
          images: [...(prev.images || []), ...validUrls]
        }))
        onMessage(`${validUrls.length} image(s) uploaded successfully`)
      } else {
        onMessage('Failed to upload images')
      }
    } catch (err: any) {
      onError(err.message || 'Failed to upload images')
    }
  }

  // Delete image
  const handleDeleteImage = async (index: number) => {
    const imageUrl = blogDraft.images?.[index]
    if (!imageUrl) return
    
    try {
      const { error } = await deleteBlogImage(imageUrl)
      if (error) {
        onError(`Failed to delete image: ${error}`)
        return
      }
      
      setBlogDraft(prev => ({
        ...prev,
        images: prev.images?.filter((_, i) => i !== index) || []
      }))
      
      onMessage('Image deleted successfully')
    } catch (err: any) {
      onError(err.message || 'Failed to delete image')
    }
  }

  // Delete blog post
  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await deleteBlogPost(postId)
      if (error) {
        onError(error)
      } else {
        onMessage('Post deleted')
        setBlogPosts(arr => arr.filter(p => p.id !== postId))
      }
    } catch (err: any) {
      onError(err.message || 'Failed to delete post')
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-neutral-100 p-4 bg-white">
      <div className="font-medium">Blog Post Manager</div>
      <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        {/* Editor Column */}
        <div className="md:col-span-2">
          <div className="grid grid-cols-1 gap-2">
            {/* Category Select */}
            <select
              value={blogDraft.category_key}
              onChange={(e) => setBlogDraft(d => ({ ...d, category_key: e.target.value }))}
              className="rounded-xl border border-neutral-200 px-3 py-2 bg-white"
            >
              <option value="restaurants-cafes">Restaurants & Cafés — Top 5 Restaurants This Month</option>
              <option value="home-services">Home Services — Bonita Home Service Deals</option>
              <option value="health-wellness">Health & Wellness — Wellness Spotlight</option>
              <option value="real-estate">Real Estate — Property Opportunities in Bonita</option>
              <option value="professional-services">Professional Services — Top Professional Services of Bonita</option>
            </select>
            
            {/* Title Input */}
            <input
              value={blogDraft.title}
              onChange={(e) => setBlogDraft(d => ({ ...d, title: e.target.value }))}
              placeholder="Post title"
              className="rounded-xl border border-neutral-200 px-3 py-2"
            />
            
            {/* Formatting Toolbar */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-neutral-500">Format:</span>
              <button type="button" onClick={() => applyFormat('bold')} className="rounded-full border border-neutral-200 px-2 py-1 bg-white font-semibold">B</button>
              <button type="button" onClick={() => applyFormat('italic')} className="rounded-full border border-neutral-200 px-2 py-1 bg-white italic">I</button>
              <button type="button" onClick={() => applyFormat('underline')} className="rounded-full border border-neutral-200 px-2 py-1 bg-white underline">U</button>
              <button type="button" onClick={() => wrapSelectionWith('span', undefined, 'font-size:20px;')} className="rounded-full border border-neutral-200 px-2 py-1 bg-white">Large</button>
              <button type="button" onClick={() => wrapSelectionWith('span', undefined, 'font-size:24px; font-weight:700;')} className="rounded-full border border-neutral-200 px-2 py-1 bg-white">XL Bold</button>
              <button type="button" onClick={clearFormattingToNormal} className="rounded-full border border-neutral-200 px-2 py-1 bg-white">Normal</button>
              <button type="button" onClick={() => setEmojiOpen(true)} className="rounded-full border border-neutral-200 px-2 py-1 bg-white">Emoji</button>
            </div>
            
            {/* Content Editor */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={syncEditorToState}
              className="rounded-xl border border-neutral-200 px-3 py-2 min-h-[200px] bg-white prose max-w-none space-y-4"
              style={{ outline: 'none' }}
              dangerouslySetInnerHTML={{ __html: blogDraft.content }}
            />
            
            {/* Emoji Picker Modal */}
            {emojiOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/20" onClick={() => setEmojiOpen(false)}></div>
                <div className="relative rounded-2xl border border-neutral-200 bg-white p-3 w-[380px] max-h-[70vh] flex flex-col shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">Choose Emoji</div>
                    <button className="text-sm" onClick={() => setEmojiOpen(false)}>Close</button>
                  </div>
                  <input
                    value={emojiQuery}
                    onChange={(e) => setEmojiQuery(e.target.value)}
                    placeholder="Search…"
                    className="mt-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm"
                  />
                  <div className="mt-2 grid grid-cols-8 gap-1 overflow-auto">
                    {filteredEmojis.map((e, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { insertEmoji(e); setEmojiOpen(false) }}
                        className="h-9 w-9 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-lg"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Image Upload Section */}
            <div className="mt-4 space-y-3">
              <div className="text-sm font-medium text-neutral-700">Images</div>
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-white"
                />
                <div className="text-xs text-neutral-500">
                  Upload AI-generated images or photos to make your blog posts more engaging
                </div>
              </div>
              
              {/* Display uploaded images */}
              {blogDraft.images && blogDraft.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {blogDraft.images.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Blog image ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-neutral-200"
                      />
                      <button
                        onClick={() => handleDeleteImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Save/New Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSavePost}
                className="btn btn-secondary text-xs"
              >
                Save Post
              </button>
              {blogDraft.id && (
                <button
                  onClick={() => {
                    setBlogDraft({
                      category_key: blogDraft.category_key,
                      title: '',
                      content: '',
                      images: []
                    })
                    if (editorRef.current) {
                      editorRef.current.innerHTML = ''
                    }
                  }}
                  className="text-xs underline"
                >
                  New
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Posts List Column */}
        <div>
          <div className="text-xs text-neutral-500 mb-1">Existing Posts</div>
          <div className="space-y-2 max-h-80 overflow-auto pr-1">
            {blogPosts.length === 0 && <div className="text-neutral-500">No posts yet.</div>}
            {blogPosts.map((bp) => (
              <div key={bp.id} className="rounded-xl border border-neutral-200 p-2">
                <div className="font-medium text-sm">{bp.title}</div>
                <div className="text-[11px] text-neutral-500">
                  {bp.category_key} • {new Date(bp.created_at).toLocaleString()}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setBlogDraft({
                        id: bp.id,
                        category_key: bp.category_key,
                        title: bp.title,
                        content: bp.content,
                        images: bp.images || []
                      })
                      if (editorRef.current) {
                        editorRef.current.innerHTML = bp.content
                      }
                    }}
                    className="btn btn-secondary text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeletePost(bp.id)}
                    className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

