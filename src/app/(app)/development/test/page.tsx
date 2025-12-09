'use client'

import * as React from 'react'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

export default function TestPage() {
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  return (
    <div className="grid">
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        className="rounded-md border w-[350px] h-[370px]"
        classNames={{
            day_selected: "bg-orange-500 text-white hover:bg-orange-600 focus:bg-orange-600 rounded-md",
        }}
      />
    </div>
  )
}
