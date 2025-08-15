import React from 'react'
import SafeIcon from '../../common/SafeIcon'
import { FiCalendar } from 'react-icons/fi'
import { format, addDays } from 'date-fns'

const DateRangeSelector = ({ selectedDateRange, onDateRangeChange }) => {
  const handleDateChange = (field, value) => {
    onDateRangeChange(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const setQuickRange = (weeks) => {
    const startDate = new Date()
    const endDate = addDays(startDate, weeks * 7)
    
    onDateRangeChange({
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd')
    })
  }

  const calculateWeeks = () => {
    if (!selectedDateRange.startDate || !selectedDateRange.endDate) return 0
    
    const start = new Date(selectedDateRange.startDate)
    const end = new Date(selectedDateRange.endDate)
    const diffTime = Math.abs(end - start)
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
    
    return diffWeeks
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <SafeIcon icon={FiCalendar} className="text-orange-600 mr-2" />
        Date Range
      </h2>

      <div className="space-y-4">
        {/* Quick Range Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setQuickRange(4)}
            className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            4 Weeks
          </button>
          <button
            onClick={() => setQuickRange(8)}
            className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            8 Weeks
          </button>
          <button
            onClick={() => setQuickRange(12)}
            className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            12 Weeks
          </button>
          <button
            onClick={() => setQuickRange(16)}
            className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            16 Weeks
          </button>
        </div>

        {/* Custom Date Inputs */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={selectedDateRange.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={selectedDateRange.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              min={selectedDateRange.startDate}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
          </div>
        </div>

        {/* Range Summary */}
        {selectedDateRange.startDate && selectedDateRange.endDate && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="text-sm text-orange-800">
              <p className="font-medium">Selected Range:</p>
              <p>{format(new Date(selectedDateRange.startDate), 'MMM d, yyyy')} - {format(new Date(selectedDateRange.endDate), 'MMM d, yyyy')}</p>
              <p className="text-orange-600 mt-1">{calculateWeeks()} weeks total</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DateRangeSelector