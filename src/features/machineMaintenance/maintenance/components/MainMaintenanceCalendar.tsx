"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useAllMaintenanceQuery } from "../server/tanstackQuery/useMaintenanceQueries";
import type { MachineMaintenance } from "../../types/types";

export default function MainMaintenanceCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: tasks = [], isLoading } = useAllMaintenanceQuery();

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  };

  const prevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get tasks for a specific day
  const getTasksForDay = (day: number) => {
    const dateStr = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day,
    ).toDateString();

    return tasks.filter((task) => {
      if (!task.task_start_date) return false;
      const taskDate = new Date(task.task_start_date).toDateString();
      return taskDate === dateStr;
    });
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = getFirstDayOfMonth(currentDate);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Generate calendar grid
  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Maintenance Calendar
          </h1>
          <p className="text-muted-foreground">
            View scheduled maintenance tasks
          </p>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        {/* Month Navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-foreground">
              {formatMonthYear(currentDate)}
            </h2>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
            >
              Today
            </button>
          </div>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-neutral-200 dark:border-neutral-700">
          {dayNames.map((day) => (
            <div
              key={day}
              className="px-2 py-3 text-center text-xs font-medium text-muted-foreground uppercase"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const tasksForDay = day ? getTasksForDay(day) : [];
            const pendingTasks = tasksForDay.filter(
              (t) => t.status !== "completed",
            );
            const completedTasks = tasksForDay.filter(
              (t) => t.status === "completed",
            );

            return (
              <div
                key={index}
                className={`min-h-25 p-2 border-b border-r border-neutral-200 dark:border-neutral-700 ${
                  day === null ? "bg-neutral-50 dark:bg-neutral-900/50" : ""
                } ${isToday(day || 0) ? "bg-green-50 dark:bg-green-900/20" : ""}`}
              >
                {day && (
                  <>
                    <div
                      className={`text-sm font-medium mb-1 ${
                        isToday(day)
                          ? "text-green-600 dark:text-green-400"
                          : "text-foreground"
                      }`}
                    >
                      {day}
                    </div>
                    <div className="space-y-1">
                      {pendingTasks.slice(0, 2).map((task) => (
                        <div
                          key={task.task_id}
                          className="px-1.5 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 rounded truncate"
                          title={`${task.machine_name}: ${task.task_description}`}
                        >
                          {task.machine_name}
                        </div>
                      ))}
                      {completedTasks.slice(0, 2).map((task) => (
                        <div
                          key={task.task_id}
                          className="px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded truncate"
                          title={`${task.machine_name}: ${task.task_description}`}
                        >
                          {task.machine_name}
                        </div>
                      ))}
                      {tasksForDay.length > 4 && (
                        <div className="text-xs text-muted-foreground">
                          +{tasksForDay.length - 4} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-100 dark:bg-yellow-900/40 border border-yellow-300 dark:border-yellow-700"></div>
          <span className="text-foreground">Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-700"></div>
          <span className="text-foreground">Completed</span>
        </div>
      </div>
    </div>
  );
}
