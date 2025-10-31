import { Tag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { generateSlug } from '../../../utils/helpers'
import type { SavedCoupon } from '../types'

interface SavedCouponsProps {
  coupons: SavedCoupon[]
  loading: boolean
  onCouponRemoved: (couponId: string) => void
  onMessage: (message: string) => void
}

export function SavedCoupons({ coupons, loading, onCouponRemoved, onMessage }: SavedCouponsProps) {
  async function handleRemove(couponId: string) {
    try {
      const { error } = await supabase
        .from('coupon_redemptions')
        .delete()
        .eq('id', couponId)
      
      if (error) {
        onMessage(error.message || 'Failed to remove coupon')
      } else {
        onCouponRemoved(couponId)
        onMessage('Coupon removed from saved')
      }
    } catch (err: any) {
      onMessage(err.message || 'Failed to remove coupon')
    }
  }

  if (loading) {
    return (
      <div className="text-center py-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    )
  }

  if (coupons.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-semibold text-neutral-800 mb-4 border-b pb-2">Saved Coupons</h3>
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8 text-center">
          <Tag className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-600 mb-2">No saved coupons yet</p>
          <p className="text-sm text-neutral-500">Save coupons from business pages to use them later</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-neutral-800 mb-4 border-b pb-2">Saved Coupons</h3>
      <div className="space-y-4">
        {coupons.map((coupon) => (
          <div key={coupon.id} className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {coupon.provider_id && coupon.provider_name ? (
                  <Link
                    to={`/provider/${encodeURIComponent(generateSlug(coupon.provider_name))}`}
                    className="font-semibold text-lg text-blue-600 hover:text-blue-700 hover:underline mb-2 inline-block"
                  >
                    {coupon.provider_name}
                  </Link>
                ) : (
                  <h3 className="font-semibold text-lg text-neutral-900 mb-2">
                    {coupon.provider_name || 'Unknown Business'}
                  </h3>
                )}
                {coupon.coupon_code && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="w-5 h-5 text-green-600" />
                      <span className="font-bold text-green-700 text-lg">{coupon.coupon_code}</span>
                    </div>
                    {coupon.coupon_discount && (
                      <p className="text-green-700 font-medium mb-1">{coupon.coupon_discount}</p>
                    )}
                    {coupon.coupon_description && (
                      <p className="text-sm text-green-600">{coupon.coupon_description}</p>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleRemove(coupon.id)}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors ml-4 flex-shrink-0"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

