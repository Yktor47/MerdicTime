"use client";

import { useState, useEffect } from "react";
import { format, getDay } from "date-fns";

interface TimesheetEntry {
  id?: string;
  date: string;
  startTime: string;
  endTime: string;
  pauseTime: string;
  targetHours: number;
  workHours: number;
  diffHours: number;
  isVacation: boolean;
  isConfirmed: boolean;
  remarks: string;
}

interface TimesheetModalProps {
  date: Date;
  existingEntry: TimesheetEntry | null;
  onClose: () => void;
  onSave: (entry: TimesheetEntry) => void;
  isAdmin?: boolean;
}

export default function TimesheetModal({ date, existingEntry, onClose, onSave, isAdmin = false }: TimesheetModalProps) {
  const formattedDate = format(date, "yyyy-MM-dd");
  
  // Default Target Hours: 10 hours for Mon-Thu (1-4)
  const dayOfWeek = getDay(date);
  const defaultTarget = (dayOfWeek >= 1 && dayOfWeek <= 4) ? 600 : 0;

  const [formData, setFormData] = useState<TimesheetEntry>({
    date: formattedDate,
    startTime: existingEntry?.startTime || "",
    endTime: existingEntry?.endTime || "",
    pauseTime: existingEntry?.pauseTime || (defaultTarget > 0 ? "00:30" : ""),
    targetHours: existingEntry?.targetHours ?? defaultTarget,
    workHours: existingEntry?.workHours || 0,
    diffHours: existingEntry?.diffHours || 0,
    isVacation: existingEntry?.isVacation || false,
    isConfirmed: existingEntry?.isConfirmed || false,
    remarks: existingEntry?.remarks || "",
  });

  const parseTime = (timeStr: string) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours * 60) + (minutes || 0);
  };

  useEffect(() => {
    let workHours = 0;

    if (formData.isVacation) {
      workHours = formData.targetHours;
    } else {
      const start = parseTime(formData.startTime);
      const end = parseTime(formData.endTime);
      const pause = parseTime(formData.pauseTime);

      if (formData.startTime && formData.endTime) {
        workHours = end - start - pause;
        if (workHours < 0) workHours = 0;
      }
    }

    const diffHours = workHours - formData.targetHours;

    setFormData(prev => ({
      ...prev,
      workHours,
      diffHours
    }));
  }, [formData.startTime, formData.endTime, formData.pauseTime, formData.isVacation, formData.targetHours]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-[#123e7f] text-white p-4 flex justify-between items-center">
          <h2 className="font-bold font-[Poppins]">Zeiten für {format(date, "dd.MM.yyyy")}</h2>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-xl">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <input 
              type="checkbox" 
              id="isVacation" 
              checked={formData.isVacation}
              onChange={(e) => setFormData({...formData, isVacation: e.target.checked})}
              className="w-4 h-4 accent-[#ed8022]"
            />
            <label htmlFor="isVacation" className="font-medium text-gray-700">Urlaub</label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Arbeitsbeginn</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                disabled={formData.isVacation}
                className="w-full p-2 border border-gray-300 rounded-md text-black font-medium focus:outline-none focus:ring-2 focus:ring-[#ed8022] disabled:bg-gray-200 disabled:text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Arbeitsende</label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                disabled={formData.isVacation}
                className="w-full p-2 border border-gray-300 rounded-md text-black font-medium focus:outline-none focus:ring-2 focus:ring-[#ed8022] disabled:bg-gray-200 disabled:text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pause</label>
            <input
              type="time"
              value={formData.pauseTime}
              onChange={(e) => setFormData({...formData, pauseTime: e.target.value})}
              disabled={formData.isVacation}
              className="w-full p-2 border border-gray-300 rounded-md text-black font-medium focus:outline-none focus:ring-2 focus:ring-[#ed8022] disabled:bg-gray-200 disabled:text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bemerkungen</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({...formData, remarks: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md text-black font-medium focus:outline-none focus:ring-2 focus:ring-[#ed8022] disabled:bg-gray-200 disabled:text-gray-900"
              rows={2}
            ></textarea>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
              <input 
                type="checkbox" 
                id="isConfirmed" 
                checked={formData.isConfirmed}
                onChange={(e) => setFormData({...formData, isConfirmed: e.target.checked})}
                className="w-4 h-4 accent-[#123e7f]"
              />
              <label htmlFor="isConfirmed" className="font-medium text-[#123e7f]">Vom Admin bestätigt</label>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">Abbrechen</button>
            <button type="submit" className="px-4 py-2 bg-[#ed8022] hover:bg-[#ff6d00] text-white font-medium rounded-md">Speichern</button>
          </div>
        </form>
      </div>
    </div>
  );
}
