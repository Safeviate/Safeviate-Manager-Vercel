'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from './scroll-area';

interface CustomCalendarProps {
    selectedDate?: Date;
    onDateSelect?: (date: Date) => void;
}

export function CustomCalendar({ selectedDate, onDateSelect }: CustomCalendarProps) {
  const [currentDate, setCurrentDate] = React.useState(selectedDate || new Date());

  React.useEffect(() => {
    // If the selectedDate prop changes, update the calendar's view
    if (selectedDate) {
        setCurrentDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  }, [selectedDate]);

  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleYearSelect = (year: number) => {
    setCurrentDate(new Date(year, currentDate.getMonth(), 1));
  };
  
  const handleMonthSelect = (monthIndex: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), monthIndex, 1));
  };

  const handleDayClick = (day: number) => {
    const newSelectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    onDateSelect?.(newSelectedDate);
  };

  const calendarDays = [];
  // Add padding for days from the previous month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(<div key={`pad-start-${i}`} className="h-9 w-9"></div>);
  }

  // Add days of the current month
  for (let day = 1; day <= daysInMonth; day++) {
    const today = new Date();
    const isToday =
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear();
    
    const isSelected = selectedDate &&
      day === selectedDate.getDate() &&
      currentDate.getMonth() === selectedDate.getMonth() &&
      currentDate.getFullYear() === selectedDate.getFullYear();

    calendarDays.push(
      <button
        key={`day-${day}`}
        onClick={() => handleDayClick(day)}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          isToday && !isSelected && 'bg-muted text-muted-foreground',
          isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90'
        )}
      >
        {day}
      </button>
    );
  }

  // Add padding for days for the next month to complete the grid
  const remainingCells = 42 - calendarDays.length; // 6 rows * 7 days
  for (let i = 0; i < remainingCells; i++) {
    calendarDays.push(<div key={`pad-end-${i}`} className="h-9 w-9"></div>);
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = Array.from({ length: 12 }, (_, i) => 
    new Date(0, i).toLocaleString('default', { month: 'long' })
  );
  const currentYear = currentDate.getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

  return (
    <div className="w-full max-w-sm rounded-lg border bg-card p-3 text-card-foreground">
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
               <Button variant="ghost" className="flex items-center gap-1 text-lg font-medium">
                {currentDate.toLocaleString('default', { month: 'long' })}
                <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                 {months.map((month, index) => (
                  <DropdownMenuItem key={month} onSelect={() => handleMonthSelect(index)}>
                    {month}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-1 text-lg font-medium">
                {currentYear}
                <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <ScrollArea className="h-60">
                {years.map((year) => (
                  <DropdownMenuItem key={year} onSelect={() => handleYearSelect(year)}>
                    {year}
                  </DropdownMenuItem>
                ))}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-y-2">{calendarDays.slice(0, 42)}</div>
    </div>
  );
}
