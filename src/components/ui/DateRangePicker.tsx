'use client';

import { useState, useEffect, useRef } from 'react';
import { DateRange, Range, RangeKeyDict } from 'react-date-range';
import { BasePost } from '@/types';
import { isDateAvailable, getNextAvailableDate, calculateCurrentPrice } from '@/lib/utils';

// Import CSS for react-date-range
import 'react-date-range/dist/styles.css'; // main style file
import 'react-date-range/dist/theme/default.css'; // theme css file

interface DateRangePickerProps {
  post: BasePost;
  onRangeChange: (range: { startDate: Date; endDate: Date; nights: number; totalPrice: number }) => void;
  className?: string;
}

export default function DateRangePicker({ post, onRangeChange, className = '' }: DateRangePickerProps) {
  const [selection, setSelection] = useState<Range>({
    startDate: new Date(),
    endDate: new Date(),
    key: 'selection',
  });

  // Find the next available date as default start date
  useEffect(() => {
    const nextAvailable = getNextAvailableDate(post);
    if (nextAvailable) {
      const endDate = new Date(nextAvailable);
      endDate.setDate(nextAvailable.getDate() + 1); // Default to 1 night
      
      setSelection({
        startDate: nextAvailable,
        endDate: endDate,
        key: 'selection',
      });
    }
  }, [post]);

  // Track previous calculation to avoid infinite loops
  const previousCalculation = useRef<{ startDate: Date; endDate: Date; nights: number; totalPrice: number } | null>(null);

  // Calculate total price when selection changes
  useEffect(() => {
    if (selection.startDate && selection.endDate) {
      const nights = Math.ceil((selection.endDate.getTime() - selection.startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (nights > 0) {
        let totalPrice = 0;
        
        for (let i = 0; i < nights; i++) {
          const currentDate = new Date(selection.startDate);
          currentDate.setDate(selection.startDate.getDate() + i);
          
          const pricing = calculateCurrentPrice(post, currentDate);
          totalPrice += pricing.price;
        }
        
        const newCalculation = {
          startDate: selection.startDate,
          endDate: selection.endDate,
          nights,
          totalPrice
        };

        // Only call onRangeChange if the calculation actually changed
        const prev = previousCalculation.current;
        const hasChanged = !prev || 
          prev.startDate.getTime() !== newCalculation.startDate.getTime() ||
          prev.endDate.getTime() !== newCalculation.endDate.getTime() ||
          prev.nights !== newCalculation.nights ||
          prev.totalPrice !== newCalculation.totalPrice;

        if (hasChanged) {
          previousCalculation.current = newCalculation;
          onRangeChange(newCalculation);
        }
      }
    }
  }, [selection, post]); // Removed onRangeChange from dependencies

  const handleRangeChange = (ranges: RangeKeyDict) => {
    const selection = ranges.selection;
    if (selection) {
      setSelection(selection);
    }
  };

  // Function to disable dates that are not available
  const disabledDate = (date: Date) => {
    // Disable past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return true;
    }

    // For fixed pricing, allow all future dates
    if (!post.pricing || post.pricing.type === 'fixed') {
      return false;
    }

    // For dynamic pricing, only allow dates with available pricing
    return !isDateAvailable(post, date);
  };

  return (
    <div className={`date-range-picker ${className}`}>
      <style jsx global>{`
        .date-range-picker .rdrCalendarWrapper {
          background: transparent;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          overflow: hidden;
        }
        
        .date-range-picker .rdrMonth {
          background: white;
        }
        
        .dark .date-range-picker .rdrMonth {
          background: #1f2937;
          color: white;
        }
        
        .date-range-picker .rdrDayDisabled {
          background-color: #f3f4f6;
          color: #9ca3af;
        }
        
        .dark .date-range-picker .rdrDayDisabled {
          background-color: #374151;
          color: #6b7280;
        }
        
        .date-range-picker .rdrDayNumber {
          padding: 0;
          height: 40px;
          width: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .date-range-picker .rdrInRange,
        .date-range-picker .rdrStartEdge,
        .date-range-picker .rdrEndEdge {
          background-color: #3b82f6;
        }
        
        .date-range-picker .rdrSelected {
          background-color: #1d4ed8;
        }
      `}</style>
      
      <DateRange
        ranges={[selection]}
        onChange={handleRangeChange}
        disabledDay={disabledDate}
        rangeColors={['#3b82f6']}
        showSelectionPreview={true}
        moveRangeOnFirstSelection={false}
        months={2}
        direction="horizontal"
        className="w-full"
        minDate={new Date()}
        maxDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)} // 1 year from now
      />
      
      {selection.startDate && selection.endDate && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Fechas seleccionadas
              </p>
              <p className="font-medium text-gray-900 dark:text-white">
                {selection.startDate.toLocaleDateString('es-AR')} - {selection.endDate.toLocaleDateString('es-AR')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {Math.ceil((selection.endDate.getTime() - selection.startDate.getTime()) / (1000 * 60 * 60 * 24))} noches
              </p>
              <p className="font-bold text-primary">
                Total: ${(() => {
                  const nights = Math.ceil((selection.endDate.getTime() - selection.startDate.getTime()) / (1000 * 60 * 60 * 24));
                  let total = 0;
                  for (let i = 0; i < nights; i++) {
                    const currentDate = new Date(selection.startDate);
                    currentDate.setDate(selection.startDate.getDate() + i);
                    const pricing = calculateCurrentPrice(post, currentDate);
                    total += pricing.price;
                  }
                  return total.toLocaleString();
                })()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
