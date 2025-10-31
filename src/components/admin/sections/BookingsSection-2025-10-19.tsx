import React, { useState } from 'react'
import { supabase } from '../../../lib/supabase'

interface BookingRow {
  id: string
  user_email: string
  category_key: string
  name: string | null
  notes: string | null
  answers: Record<string, string> | null
  status: string | null
  created_at: string
}

interface BookingsSectionProps {
  bookings: BookingRow[]
  onMessage: (msg: string | null) => void
  onError: (err: string | null) => void
  onBookingsUpdate: (bookings: BookingRow[]) => void
}

export const BookingsSection: React.FC<BookingsSectionProps> = ({
  bookings,
  onMessage,
  onError,
  onBookingsUpdate
}) => {
  const [editBooking, setEditBooking] = useState<Record<string, { 
    name?: string
    notes?: string
    answers?: string
    status?: string 
  }>>({})

  const handleSaveBooking = async (row: BookingRow) => {
    const edit = editBooking[row.id] || {}
    const payload: any = {
      name: edit.name ?? row.name,
      notes: edit.notes ?? row.notes,
      status: edit.status ?? row.status
    }
    
    if (typeof edit.answers === 'string') {
      try {
        payload.answers = JSON.parse(edit.answers)
      } catch {
        // Keep original answers if parse fails
      }
    }
    
    const { error } = await supabase
      .from('bookings')
      .update(payload)
      .eq('id', row.id)
    
    if (error) {
      onError(error.message)
    } else {
      onMessage('Booking saved')
    }
  }

  const handleDeleteBooking = async (row: BookingRow) => {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', row.id)
    
    if (error) {
      onError(error.message)
    } else {
      onBookingsUpdate(bookings.filter((b) => b.id !== row.id))
      onMessage('Booking deleted')
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-100 p-4 bg-white hover-gradient interactive-card">
      <div className="font-medium">Bookings</div>
      <div className="mt-2 space-y-2 text-sm">
        {bookings.length === 0 && (
          <div className="text-neutral-500">No entries yet.</div>
        )}
        {bookings.map((row) => (
          <div key={row.id} className="rounded-xl border border-neutral-200 p-3 hover-gradient interactive-card">
            <div className="text-neutral-800 font-medium">{row.category_key}</div>
            <div className="text-neutral-500 text-xs">{new Date(row.created_at).toLocaleString()}</div>
            
            <input 
              id={`booking-name-${row.id}`}
              name={`booking-name-${row.id}`}
              className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" 
              defaultValue={row.name || ''} 
              placeholder="Name" 
              onChange={(e) => setEditBooking((m) => ({ 
                ...m, 
                [row.id]: { ...(m[row.id] || {}), name: e.target.value } 
              }))} 
            />
            
            <textarea 
              id={`booking-notes-${row.id}`}
              name={`booking-notes-${row.id}`}
              className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm" 
              defaultValue={row.notes || ''} 
              placeholder="Notes" 
              onChange={(e) => setEditBooking((m) => ({ 
                ...m, 
                [row.id]: { ...(m[row.id] || {}), notes: e.target.value } 
              }))} 
            />
            
            {row.answers && (
              <textarea 
                id={`booking-answers-${row.id}`}
                name={`booking-answers-${row.id}`}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs" 
                defaultValue={JSON.stringify(row.answers, null, 2)} 
                onChange={(e) => setEditBooking((m) => ({ 
                  ...m, 
                  [row.id]: { ...(m[row.id] || {}), answers: e.target.value } 
                }))} 
              />
            )}
            
            <select 
              className="mt-1 rounded-xl border border-neutral-200 px-3 py-2 text-xs bg-white" 
              defaultValue={row.status || 'new'} 
              onChange={(e) => setEditBooking((m) => ({ 
                ...m, 
                [row.id]: { ...(m[row.id] || {}), status: e.target.value } 
              }))}
            >
              <option value="new">new</option>
              <option value="in_progress">in_progress</option>
              <option value="closed">closed</option>
            </select>
            
            <div className="mt-2 flex items-center gap-2">
              <button 
                onClick={() => handleSaveBooking(row)} 
                className="btn btn-secondary text-xs"
              >
                Save
              </button>
              <button 
                onClick={() => handleDeleteBooking(row)} 
                className="rounded-full bg-red-50 text-red-700 px-3 py-1.5 border border-red-200 text-xs"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

