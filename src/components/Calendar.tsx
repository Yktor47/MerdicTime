"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";

interface CalendarProps {
  currentMonth: Date;
  entries: any[];
  onDayClick: (date: Date) => void;
}

export default function Calendar({ currentMonth, entries, onDayClick }: CalendarProps) {
  const [days, setDays] = useState<Date[]>([]);

  useEffect(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    setDays(eachDayOfInterval({ start, end }));
  }, [currentMonth]);

  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  const getOffset = (date: Date) => {
    const day = getDay(date);
    return day === 0 ? 6 : day - 1;
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-md border-t-4 border-[#123e7f] overflow-hidden">
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {weekDays.map(day => (
          <div key={day} className="bg-gray-50 text-center py-2 font-semibold text-sm text-[#123e7f]">
            {day}
          </div>
        ))}
        
        {days.length > 0 && Array.from({ length: getOffset(days[0]) }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-gray-100 p-2 min-h-[100px]"></div>
        ))}

        {days.map(day => {
          const formattedDate = format(day, "yyyy-MM-dd");
          const entry = entries.find(e => e.date === formattedDate);
          const hasGps = entry && (entry.startLat || entry.endLat);
          
          return (
            <div 
              key={day.toISOString()} 
              className="bg-white p-2 min-h-[100px] cursor-pointer hover:bg-[#f5f8ff] transition-colors border border-transparent hover:border-[#ed8022]"
              onClick={() => onDayClick(day)}
            >
              <div className="flex justify-between items-start gap-1">
                <span className="font-bold text-black">{format(day, "d")}</span>
                <div className="flex flex-col gap-0.5 items-end">
                  {entry && entry.isVacation && entry.vacationConfirmed && (
                    <span className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-semibold">✓ Urlaub</span>
                  )}
                  {entry && entry.isVacation && !entry.vacationConfirmed && (
                    <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-semibold">⏳ Urlaub</span>
                  )}
                  {entry && entry.isSick && (
                    <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-semibold">Krank</span>
                  )}
                  {hasGps && (
                    <span className="text-[10px] text-gray-400">📍</span>
                  )}
                </div>
              </div>
              {entry && !entry.isVacation && !entry.isSick && entry.workHours > 0 && (
                <div className="mt-1 text-sm text-[#123e7f] font-[Poppins]">
                  <div>{formatTime(entry.workHours)}h</div>
                  {entry.diffHours !== 0 && (
                    <div className={`text-xs ${entry.diffHours > 0 ? "text-green-600" : "text-red-600"}`}>
                      {entry.diffHours > 0 ? "+" : ""}{formatTime(entry.diffHours)}h
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTime(minutes: number) {
  const isNegative = minutes < 0;
  const absMinutes = Math.abs(minutes);
  const h = Math.floor(absMinutes / 60);
  const m = Math.round(absMinutes % 60);
  return `${isNegative ? '-' : ''}${h}:${String(m).padStart(2, '0')}`;
}
