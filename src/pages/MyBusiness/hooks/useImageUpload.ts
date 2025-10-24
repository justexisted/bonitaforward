import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { ImageUploadProgress } from '../types'

/**
 * Custom hook for handling image uploads to Supabase Storage
 * 
 * Features:
 * - Tracks upload progress for multiple files
 * - Handles single vs multiple image uploads (member vs free accounts)
 * - Automatic file cleanup on errors
 * - Returns loading state and progress tracking
 * 
 * @param isMember - Whether the user is a featured member (unlimited images) or free (1 image max)
 * @returns Object with upload function, loading state, and progress tracking
 */
export function useImageUpload(isMember: boolean) {
  const [uploadingImages, setUploadingImages] = useState(false)
  const [imageUploadProgress, setImageUploadProgress] = useState<ImageUploadProgress>({})

  /**
   * Uploads a single image to Supabase Storage
   * 
   * @param file - The image file to upload
   * @param businessId - The provider/business ID for organizing uploads
   * @returns Promise<string> - The public URL of the uploaded image
   * @throws Error if upload fails
   */
  const uploadSingleImage = async (file: File, businessId: string): Promise<string> => {
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${businessId}/${timestamp}-${sanitizedFileName}`

    console.log('[useImageUpload] Uploading image:', { businessId, file: file.name, path })

    const { error: uploadError } = await supabase.storage
      .from('business-images')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('[useImageUpload] Upload failed:', uploadError)
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    const { data: urlData } = supabase.storage
      .from('business-images')
      .getPublicUrl(path)

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL for uploaded image')
    }

    console.log('[useImageUpload] Upload successful:', urlData.publicUrl)
    return urlData.publicUrl
  }

  /**
   * Uploads multiple images with progress tracking
   * 
   * @param files - Array or FileList of images to upload
   * @param businessId - The provider/business ID for organizing uploads
   * @returns Promise<string[]> - Array of public URLs for uploaded images
   */
  const uploadImages = async (
    files: FileList | File[], 
    businessId: string
  ): Promise<string[]> => {
    setUploadingImages(true)
    
    try {
      // Free accounts: only upload first image
      // Featured accounts: upload all images
      const filesToProcess = !isMember ? [files[0]] : Array.from(files)
      
      console.log(`[useImageUpload] Processing ${filesToProcess.length} image(s) for ${isMember ? 'featured' : 'free'} account`)

      const uploadPromises = filesToProcess.map(async (file, index) => {
        const fileId = `${file.name}-${index}`
        
        // Track upload progress (for UI feedback)
        setImageUploadProgress(prev => ({ ...prev, [fileId]: 0 }))
        
        try {
          const imageUrl = await uploadSingleImage(file, businessId)
          
          // Simulate progress completion (in real implementation, use upload progress events)
          setImageUploadProgress(prev => ({ ...prev, [fileId]: 100 }))
          
          return imageUrl
        } catch (error: any) {
          console.error(`[useImageUpload] Failed to upload ${file.name}:`, error)
          
          // Show user-friendly error
          if (error.message.includes('already exists')) {
            throw new Error(`File "${file.name}" already exists. Please rename and try again.`)
          }
          
          return null
        } finally {
          // Remove progress tracking
          setImageUploadProgress(prev => {
            const newProgress = { ...prev }
            delete newProgress[fileId]
            return newProgress
          })
        }
      })

      const results = await Promise.all(uploadPromises)
      const successfulUploads = results.filter((url): url is string => url !== null)
      
      console.log(`[useImageUpload] Uploaded ${successfulUploads.length}/${filesToProcess.length} images successfully`)
      
      return successfulUploads
    } finally {
      setUploadingImages(false)
      setImageUploadProgress({})
    }
  }

  /**
   * Deletes an image from Supabase Storage
   * 
   * @param imageUrl - The full public URL of the image to delete
   * @returns Promise<boolean> - True if deletion was successful
   */
  const deleteImage = async (imageUrl: string): Promise<boolean> => {
    try {
      // Extract the path from the full URL
      const urlParts = imageUrl.split('/business-images/')
      if (urlParts.length < 2) {
        console.error('[useImageUpload] Invalid image URL format:', imageUrl)
        return false
      }
      
      const path = urlParts[1]
      console.log('[useImageUpload] Deleting image:', path)

      const { error } = await supabase.storage
        .from('business-images')
        .remove([path])

      if (error) {
        console.error('[useImageUpload] Delete failed:', error)
        return false
      }

      console.log('[useImageUpload] Image deleted successfully')
      return true
    } catch (error) {
      console.error('[useImageUpload] Unexpected error during delete:', error)
      return false
    }
  }

  return {
    uploadImages,
    deleteImage,
    uploadingImages,
    imageUploadProgress
  }
}

