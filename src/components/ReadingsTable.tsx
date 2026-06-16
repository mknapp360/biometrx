import { useState } from 'react'
import { format } from 'date-fns'
import { Trash2, Pencil } from 'lucide-react'
import type { HealthReading } from '../types'

interface ReadingsTableProps {
  readings: HealthReading[]
  onDelete: (id: string) => Promise<{ error: unknown }>
  onEdit: (reading: HealthReading) => void
}

type FilterRange = '7' | '30' | '90' | 'all'

export default function ReadingsTable({ readings, onDelete, onEdit }: ReadingsTableProps) {
  const [filter, setFilter] = useState<FilterRange>('30')
  const [deleting, setDeleting] = useState<string | null>(null)

  const now = new Date()
  const filtered = filter === 'all'
    ? readings
    : readings.filter(r => {
        const days = parseInt(filter)
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
        return new Date(r.recorded_at) >= cutoff
      })

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this reading?')) return
    setDeleting(id)
    await onDelete(id)
    setDeleting(null)
  }

  return (
    <div>
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {(['7', '30', '90', 'all'] as FilterRange[]).map(range => (
          <button
            key={range}
            onClick={() => setFilter(range)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === range
                ? 'bg-brand-green text-white'
                : 'bg-[#1e3029] text-gray-400 hover:bg-[#253d34]'
            }`}
          >
            {range === 'all' ? 'All' : `${range}d`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No readings in this period.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className="card flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-1">
                  {format(new Date(r.recorded_at), 'EEE dd MMM yyyy, HH:mm')}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span className="font-semibold">
                    {r.systolic}/{r.diastolic}
                    <span className="text-gray-400 font-normal ml-1">mmHg</span>
                  </span>
                  {r.pulse && (
                    <span>
                      {r.pulse}
                      <span className="text-gray-400 ml-1">bpm</span>
                    </span>
                  )}
                  {r.weight_kg && (
                    <span>
                      {r.weight_kg}
                      <span className="text-gray-400 ml-1">kg</span>
                    </span>
                  )}
                  {r.map && (
                    <span className="text-gray-500">
                      MAP {Number(r.map).toFixed(0)}
                    </span>
                  )}
                </div>
                {r.notes && (
                  <p className="text-xs text-gray-400 mt-1 truncate">{r.notes}</p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => onEdit(r)}
                  className="p-2 rounded-lg text-gray-500 hover:text-brand-green hover:bg-[#1e3029] transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  disabled={deleting === r.id}
                  className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
