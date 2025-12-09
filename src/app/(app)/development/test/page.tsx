'use client'

import * as React from 'react'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export default function TestPage() {
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [date2, setDate2] = React.useState<Date | undefined>(new Date())

  const calendarClassNames = {
    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
    month: "space-y-4 h-[280px]",
    caption: "flex justify-center pt-1 relative items-center",
    caption_label: "text-sm font-medium",
    nav: "space-x-1 flex items-center",
    nav_button: cn(
      buttonVariants({ variant: "outline" }),
      "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
    ),
    nav_button_previous: "absolute left-1",
    nav_button_next: "absolute right-1",
    table: "w-full border-collapse space-y-1",
    head_row: "flex",
    head_cell:
      "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
    row: "flex w-full mt-2",
    cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
    day: cn(
      buttonVariants({ variant: "ghost" }),
      "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
    ),
    day_range_end: "day-range-end",
    day_selected:
        "bg-orange-500 text-white hover:bg-orange-600 focus:bg-orange-600 rounded-md", // Custom orange theme
    day_today: "bg-accent text-accent-foreground",
    day_outside:
      "day-outside text-muted-foreground opacity-50",
    day_disabled: "text-muted-foreground opacity-50",
    day_range_middle:
      "aria-selected:bg-accent aria-selected:text-accent-foreground",
    day_hidden: "invisible",
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="rounded-md border w-[350px] inline-block"
          classNames={calendarClassNames}
        />
        <Calendar
          mode="single"
          selected={date2}
          onSelect={setDate2}
          className="rounded-md border w-[350px] inline-block ml-4"
          classNames={calendarClassNames}
        />
      </div>
    </div>
  )
}
