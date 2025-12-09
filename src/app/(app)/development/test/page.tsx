'use client'

import * as React from 'react'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

export default function TestPage() {
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [date2, setDate2] = React.useState<Date | undefined>(new Date())

  return (
    <div className="grid grid-cols-2 gap-4">
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className="rounded-md border w-[350px]"
        classNames={{
            month: 'h-[280px]', // This forces the month view to a fixed height
            day_selected: "bg-orange-500 text-white hover:bg-orange-600 focus:bg-orange-600 rounded-md",
        }}
      />
      <Calendar
        mode="single"
        selected={date2}
        onSelect={setDate2}
        className="rounded-md border w-[350px]"
        classNames={{
            month: 'h-[280px]', // This forces the month view to a fixed height
            day_selected: "bg-orange-500 text-white hover:bg-orange-600 focus:bg-orange-600 rounded-md",
        }}
      />
    </div>
  )
}
