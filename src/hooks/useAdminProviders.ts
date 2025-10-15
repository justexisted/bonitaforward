import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { ProviderRow } from '../types/admin'

export function useAdminProviders() {
  const [providers, setProviders] = useState<ProviderRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savingProvider, setSavingProvider] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [retryProvider, setRetryProvider] = useState<ProviderRow | null>(null)
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null)
  const [confirmDeleteProviderId, setConfirmDeleteProviderId] = useState<string | null>(null)

  const loadProviders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) throw error
      setProviders(data || [])
    } catch (err: any) {
      setError(err.message)
      console.error('Error loading providers:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const saveProvider = useCallback(async (provider: ProviderRow) => {
    setSavingProvider(true)
    setError(null)
    try {
      const { error } = await supabase
        .from('providers')
        .upsert([provider])
      
      if (error) throw error
      
      // Update local state
      setProviders(prev => 
        prev.some(p => p.id === provider.id) 
          ? prev.map(p => p.id === provider.id ? provider : p)
          : [...prev, provider]
      )
      
      return { success: true }
    } catch (err: any) {
      setError(err.message)
      setRetryProvider(provider)
      return { success: false, error: err.message }
    } finally {
      setSavingProvider(false)
    }
  }, [])

  const deleteProvider = useCallback(async (providerId: string) => {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase
        .from('providers')
        .delete()
        .eq('id', providerId)
      
      if (error) throw error
      
      setProviders(prev => prev.filter(p => p.id !== providerId))
      setConfirmDeleteProviderId(null)
      
      return { success: true }
    } catch (err: any) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const toggleFeaturedStatus = useCallback(async (providerId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('providers')
        .update({ 
          is_featured: !currentStatus,
          featured_since: !currentStatus ? new Date().toISOString() : null
        })
        .eq('id', providerId)
      
      if (error) throw error
      
      setProviders(prev => 
        prev.map(p => 
          p.id === providerId 
            ? { ...p, is_featured: !currentStatus, featured_since: !currentStatus ? new Date().toISOString() : null }
            : p
        )
      )
      
      return { success: true }
    } catch (err: any) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }, [])

  const updateSubscriptionType = useCallback(async (providerId: string, subscriptionType: 'monthly' | 'yearly') => {
    try {
      const { error } = await supabase
        .from('providers')
        .update({ subscription_type: subscriptionType })
        .eq('id', providerId)
      
      if (error) throw error
      
      setProviders(prev => 
        prev.map(p => 
          p.id === providerId 
            ? { ...p, subscription_type: subscriptionType }
            : p
        )
      )
      
      return { success: true }
    } catch (err: any) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }, [])

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>, providerId: string) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingImages(true)
    try {
      // Implementation for image upload
      // This would need to be implemented based on your image storage solution
      console.log('Image upload for provider:', providerId, file)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploadingImages(false)
    }
  }, [])

  const removeImage = useCallback(async (providerId: string, imageUrl: string) => {
    try {
      // Implementation for image removal
      console.log('Remove image for provider:', providerId, imageUrl)
    } catch (err: any) {
      setError(err.message)
    }
  }, [])

  return {
    // State
    providers,
    loading,
    error,
    savingProvider,
    uploadingImages,
    retryProvider,
    selectedProviderId,
    confirmDeleteProviderId,
    
    // Actions
    loadProviders,
    saveProvider,
    deleteProvider,
    toggleFeaturedStatus,
    updateSubscriptionType,
    handleImageUpload,
    removeImage,
    
    // Setters
    setError,
    setRetryProvider,
    setSelectedProviderId,
    setConfirmDeleteProviderId,
  }
}
