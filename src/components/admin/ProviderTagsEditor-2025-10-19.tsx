import { type ProviderRow } from '../../pages/Admin'

/**
 * PROVIDER TAGS EDITOR
 * 
 * Step 6 of gradual Admin.tsx extraction.
 * Manages provider tags (comma-separated input).
 * 
 * Features:
 * - Comma-separated tag input
 * - Auto-save on blur
 * - Tag validation (trim, filter empty)
 * - Already uses defaultValue pattern (optimized)
 * 
 * Future enhancements:
 * - Tag pills with X to remove
 * - Category-specific tag suggestions
 * - Popular tags list
 * - Drag-and-drop tag reordering
 */

interface ProviderTagsEditorProps {
  provider: ProviderRow
  onUpdate: (tags: string[]) => void
}

export function ProviderTagsEditor({ 
  provider, 
  onUpdate 
}: ProviderTagsEditorProps) {
  const currentTags = provider.tags || []

  const handleTagsChange = (value: string) => {
    // Parse comma-separated tags, trim whitespace, remove empties
    const tags = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    
    onUpdate(tags)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-1">
        Tags
      </label>
      <input 
        defaultValue={currentTags.join(', ')} 
        key={`tags-${provider.id}`}
        onBlur={(e) => handleTagsChange(e.target.value)}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-500" 
        placeholder="professional, reliable, local, certified"
      />
      <p className="text-xs text-neutral-500 mt-1">
        Type comma-separated values. Changes save when you click outside the field.
      </p>

      {/* Tag Preview (optional) */}
      {currentTags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {currentTags.map((tag, idx) => (
            <span 
              key={idx}
              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-200"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

