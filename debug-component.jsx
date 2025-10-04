// Debug component to help troubleshoot provider and image issues
// Add this to your App.tsx temporarily to debug

import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

function DebugComponent() {
  const [debugData, setDebugData] = useState(null)
  const [loading, setLoading] = useState(false)

  const runDebug = async () => {
    setLoading(true)
    try {
      // Get all providers
      const { data: allProviders, error: allError } = await supabase
        .from('providers')
        .select('*')
        .limit(100)

      if (allError) throw allError

      // Analyze the data
      const analysis = {
        total: allProviders.length,
        byCategory: {},
        publishedCount: 0,
        unpublishedCount: 0,
        withImages: 0,
        imageIssues: [],
        categoryIssues: []
      }

      allProviders.forEach(provider => {
        const cat = provider.category_key || 'unknown'
        if (!analysis.byCategory[cat]) {
          analysis.byCategory[cat] = {
            total: 0,
            published: 0,
            unpublished: 0,
            withImages: 0,
            imageIssues: 0
          }
        }
        
        analysis.byCategory[cat].total++
        
        // Check published status
        const isPublished = provider.published === true || provider.published === 'true' || provider.published === 1
        if (isPublished) {
          analysis.publishedCount++
          analysis.byCategory[cat].published++
        } else {
          analysis.unpublishedCount++
          analysis.byCategory[cat].unpublished++
        }

        // Check images
        if (provider.images && Array.isArray(provider.images) && provider.images.length > 0) {
          analysis.withImages++
          analysis.byCategory[cat].withImages++
          
          // Check for image issues
          const hasInvalidImages = provider.images.some(img => 
            !img || typeof img !== 'string' || img.trim().length === 0
          )
          if (hasInvalidImages) {
            analysis.imageIssues.push({
              name: provider.name,
              category: cat,
              images: provider.images
            })
            analysis.byCategory[cat].imageIssues++
          }
        }

        // Check for category issues
        if (!provider.category_key || provider.category_key.trim() === '') {
          analysis.categoryIssues.push({
            name: provider.name,
            id: provider.id,
            category_key: provider.category_key
          })
        }
      })

      setDebugData(analysis)
    } catch (error) {
      console.error('Debug failed:', error)
      setDebugData({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const testImageUrl = async (url) => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve({ url, status: 'success' })
      img.onerror = () => resolve({ url, status: 'failed' })
      img.src = url
      // Timeout after 5 seconds
      setTimeout(() => resolve({ url, status: 'timeout' }), 5000)
    })
  }

  const testImages = async () => {
    if (!debugData || !debugData.imageIssues.length) return
    
    setLoading(true)
    const results = []
    for (const issue of debugData.imageIssues.slice(0, 5)) { // Test first 5
      for (const imgUrl of issue.images.slice(0, 2)) { // Test first 2 images per provider
        const result = await testImageUrl(imgUrl)
        results.push({ ...issue, ...result })
      }
    }
    console.log('Image test results:', results)
    setLoading(false)
  }

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px', backgroundColor: '#f9f9f9' }}>
      <h3>🔍 Provider Debug Tool</h3>
      <button onClick={runDebug} disabled={loading}>
        {loading ? 'Running Debug...' : 'Run Debug Analysis'}
      </button>
      
      {debugData && !debugData.error && (
        <div style={{ marginTop: '20px' }}>
          <h4>📊 Summary</h4>
          <p>Total Providers: {debugData.total}</p>
          <p>Published: {debugData.publishedCount}</p>
          <p>Unpublished: {debugData.unpublishedCount}</p>
          <p>With Images: {debugData.withImages}</p>
          <p>Image Issues: {debugData.imageIssues.length}</p>
          <p>Category Issues: {debugData.categoryIssues.length}</p>

          <h4>📈 By Category</h4>
          {Object.entries(debugData.byCategory).map(([category, stats]) => (
            <div key={category} style={{ marginBottom: '10px', padding: '10px', backgroundColor: 'white' }}>
              <strong>{category}:</strong> {stats.total} total, {stats.published} published, {stats.withImages} with images, {stats.imageIssues} image issues
            </div>
          ))}

          {debugData.imageIssues.length > 0 && (
            <div>
              <h4>🖼️ Image Issues</h4>
              <button onClick={testImages} disabled={loading}>
                {loading ? 'Testing Images...' : 'Test Image URLs'}
              </button>
              {debugData.imageIssues.slice(0, 10).map((issue, idx) => (
                <div key={idx} style={{ marginBottom: '10px', padding: '10px', backgroundColor: 'white' }}>
                  <strong>{issue.name}</strong> ({issue.category})
                  <br />
                  Images: {JSON.stringify(issue.images)}
                </div>
              ))}
            </div>
          )}

          {debugData.categoryIssues.length > 0 && (
            <div>
              <h4>⚠️ Category Issues</h4>
              {debugData.categoryIssues.map((issue, idx) => (
                <div key={idx} style={{ marginBottom: '10px', padding: '10px', backgroundColor: 'white' }}>
                  <strong>{issue.name}</strong> (ID: {issue.id})
                  <br />
                  Category: "{issue.category_key}"
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {debugData && debugData.error && (
        <div style={{ color: 'red', marginTop: '20px' }}>
          <h4>❌ Error</h4>
          <p>{debugData.error}</p>
        </div>
      )}
    </div>
  )
}

export default DebugComponent
