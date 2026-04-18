"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Filter,
  User,
  ChevronDown,
  LayoutGrid,
  CalendarDays,
} from "lucide-react";
import { useRBAC } from "@/hooks/useRBAC";
import supabase from "@/utils/supabaseClient";
import { useQuery } from "@tanstack/react-query";

// ============ Types ============

type EventStatus = "completed" | "overdue" | "pending";
type EventType = "Maintenance" | "Repair" | "Checklist" | "Delegation";
type ViewMode = "month" | "week";

interface CalendarEvent {
  id: string | number;
  title: string;
  date: string; // YYYY-MM-DD for easy comparison
  status: EventStatus;
  type: EventType;
  description: string;
  assignedTo?: string;
}

// ============ Status derivation ============

function deriveStatus(
  rawStatus: string | null | undefined,
  taskStartDate: string | null | undefined,
  submissionDate?: string | null,
  actualDate?: string | null,
): EventStatus {
  if (
    submissionDate ||
    actualDate ||
    rawStatus === "done" ||
    rawStatus === "completed"
  ) {
    return "completed";
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (taskStartDate) {
    const d = new Date(taskStartDate);
    d.setHours(0, 0, 0, 0);
    if (d < today) return "overdue";
  }
  return "pending";
}

function toDateStr(isoOrDate: string | null | undefined): string {
  if (!isoOrDate) return "";
  return isoOrDate.substring(0, 10); // "2026-03-19"
}

// Check if a task matches the selected user, including Hemlata Verma when Ritu Sahu is selected
function checkNameMatch(assignedToRaw: string | undefined, selectedUserRaw: string | null): boolean {
  if (!selectedUserRaw) return true;
  const assignedTo = (assignedToRaw || "").toLowerCase().trim();
  const selectedUser = selectedUserRaw.toLowerCase().trim();
  
  if (selectedUser === "ritu sahu") {
    return assignedTo === "ritu sahu" || assignedTo === "hemlata verma";
  }
  return assignedTo === selectedUser;
}

// ============ UI Config ============

const STATUS_CONFIG: Record<
  EventStatus,
  { label: string; bg: string; text: string; border: string; icon: any }
> = {
  completed: {
    label: "Completed",
    bg: "bg-green-50 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-200 dark:border-green-800",
    icon: CheckCircle2,
  },
  pending: {
    label: "Pending",
    bg: "bg-amber-50 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    icon: Clock,
  },
  overdue: {
    label: "Overdue",
    bg: "bg-red-50 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
    icon: AlertTriangle,
  },
};

const TYPE_CONFIG: Record<
  EventType,
  { color: string; bg: string; darkBg: string; letter: string }
> = {
  Maintenance: {
    color: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-50",
    darkBg: "dark:bg-blue-900/30",
    letter: "M",
  },
  Repair: {
    color: "text-red-700 dark:text-red-300",
    bg: "bg-red-50",
    darkBg: "dark:bg-red-900/30",
    letter: "R",
  },
  Checklist: {
    color: "text-orange-700 dark:text-orange-300",
    bg: "bg-orange-50",
    darkBg: "dark:bg-orange-900/30",
    letter: "C",
  },
  Delegation: {
    color: "text-purple-700 dark:text-purple-300",
    bg: "bg-purple-50",
    darkBg: "dark:bg-purple-900/30",
    letter: "D",
  },
};

// ============ Component ============

export default function MainMaintenanceCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // "YYYY-MM-DD"
  const [selectedDayLabel, setSelectedDayLabel] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedTypes, setSelectedTypes] = useState<EventType[]>([
    "Maintenance",
    "Repair",
    "Checklist",
    "Delegation",
  ]); // New filter state
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedWeek, setSelectedWeek] = useState<number>(0); // 0‑based index into weeks array

  // Ref for dropdown container
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        typeDropdownRef.current &&
        !typeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsTypeDropdownOpen(false);
      }
    };

    // Add event listener when dropdown is open
    if (isTypeDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    // Cleanup event listener
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isTypeDropdownOpen]);

  useEffect(() => {
    setCurrentRole(localStorage.getItem("role"));
    setCurrentUsername(localStorage.getItem("user-name"));
  }, []);

  const isAdmin = currentRole !== "user";

  // ============ Type filter handlers ============
  const toggleTypeFilter = (type: EventType) => {
    if (selectedTypes.includes(type)) {
      // If removing the last type, don't allow (optional - prevents empty filter)
      if (selectedTypes.length === 1) return;
      setSelectedTypes(selectedTypes.filter((t) => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const selectAllTypes = () => {
    setSelectedTypes(["Maintenance", "Repair", "Checklist", "Delegation"]);
  };

  const clearAllTypes = () => {
    setSelectedTypes([]);
  };

  // ============ Month boundaries ============
  const monthStartISO = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01T00:00:00.000Z`;
  }, [currentDate]);

  const monthEndISO = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0,
    ).getDate();
    const lastDayStr = String(lastDay).padStart(2, "0");
    return `${y}-${m}-${lastDayStr}T23:59:59.999Z`;
  }, [currentDate]);

  // ============ GRID Query: current month only ============
  // Increased limit significantly (from 300 to 5000) because high task volume days can cut off the rest of the month
  const { data: gridRawData, isLoading: isGridLoading } = useQuery({
    queryKey: ["calendar-grid", monthStartISO, monthEndISO],
    queryFn: async () => {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, "0");
      const daysInMonth = new Date(year, currentDate.getMonth() + 1, 0).getDate();

      const promises = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = String(day).padStart(2, "0");
        const dayStartISO = `${year}-${month}-${dayStr}T00:00:00.000Z`;
        const dayEndISO = `${year}-${month}-${dayStr}T23:59:59.999Z`;

        promises.push(
          Promise.all([
            supabase
              .from("machine_maintenance")
              .select(
                "task_id, machine_name, task_description, task_start_date, status, actual_date, doer_name, assigned_to",
              )
              .gte("task_start_date", dayStartISO)
              .lte("task_start_date", dayEndISO),
            supabase
              .from("machine_repair")
              .select(
                "task_id, machine_name, issue_detail, task_start_date, status, actual_date, assigned_to, form_filled_by",
              )
              .gte("task_start_date", dayStartISO)
              .lte("task_start_date", dayEndISO),
            supabase
              .from("checklist")
              .select(
                "task_id, name, task_description, task_start_date, submission_date",
              )
              .gte("task_start_date", dayStartISO)
              .lte("task_start_date", dayEndISO),
            supabase
              .from("delegation")
              .select(
                "task_id, name, task_description, task_start_date, status, submission_date",
              )
              .gte("task_start_date", dayStartISO)
              .lte("task_start_date", dayEndISO),
          ])
        );
      }

      const dailyResults = await Promise.all(promises);

      const allMaintenance: any[] = [];
      const allRepair: any[] = [];
      const allChecklist: any[] = [];
      const allDelegation: any[] = [];

      dailyResults.forEach(([m, r, c, d]) => {
        if (m.data) allMaintenance.push(...m.data);
        if (r.data) allRepair.push(...r.data);
        if (c.data) allChecklist.push(...c.data);
        if (d.data) allDelegation.push(...d.data);
      });

      return {
        maintenance: allMaintenance,
        repair: allRepair,
        checklist: allChecklist,
        delegation: allDelegation,
      };
    },
    staleTime: 10000 * 60 * 2,
  });

  // ============ MODAL Query: triggered on date click ============
  const { data: dayRawData, isLoading: isDayLoading } = useQuery({
    queryKey: ["calendar-day", selectedDate],
    queryFn: async () => {
      if (!selectedDate) return null;
      const dayStartISO = `${selectedDate}T00:00:00.000Z`;
      const dayEndISO = `${selectedDate}T23:59:59.999Z`;

      const [m, r, c, d] = await Promise.all([
        supabase
          .from("machine_maintenance")
          .select("*")
          .gte("task_start_date", dayStartISO)
          .lte("task_start_date", dayEndISO),
        supabase
          .from("machine_repair")
          .select("*")
          .gte("task_start_date", dayStartISO)
          .lte("task_start_date", dayEndISO),
        supabase
          .from("checklist")
          .select("*")
          .gte("task_start_date", dayStartISO)
          .lte("task_start_date", dayEndISO),
        supabase
          .from("delegation")
          .select("*")
          .gte("task_start_date", dayStartISO)
          .lte("task_start_date", dayEndISO),
      ]);
      return {
        maintenance: m.data || [],
        repair: r.data || [],
        checklist: c.data || [],
        delegation: d.data || [],
      };
    },
    enabled: !!selectedDate,
    staleTime: 1000 * 60 * 1,
  });

  // Fetch users list (admin only)
  const { data: usersData = [] } = useQuery({
    queryKey: ["calendar-users"],
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("id, user_name")
        .not("user_name", "is", null)
        .neq("user_name", "")
        .order("user_name", { ascending: true });
      return data || [];
    },
    enabled: isAdmin,
  });

  const { canRead, isLoading: isRbacLoading } = useRBAC("maintenance_calendar");

  // ============ Build grid events ============
  const gridEvents = useMemo((): CalendarEvent[] => {
    if (!gridRawData) return [];
    const events: CalendarEvent[] = [];

    // Process Maintenance
    (gridRawData.maintenance as any[]).forEach((m) => {
      if (!m.task_start_date) return;
      events.push({
        id: `m-${m.task_id}`,
        title: m.machine_name || "Maintenance",
        date: toDateStr(m.task_start_date),
        status: deriveStatus(m.status, m.task_start_date, null, m.actual_date),
        type: "Maintenance",
        description: m.task_description || "",
        assignedTo: m.doer_name || m.assigned_to || "",
      });
    });

    // Process Repair
    (gridRawData.repair as any[]).forEach((r) => {
      if (!r.task_start_date) return;
      events.push({
        id: `r-${r.task_id}`,
        title: r.machine_name || "Repair",
        date: toDateStr(r.task_start_date),
        status: deriveStatus(r.status, r.task_start_date, null, r.actual_date),
        type: "Repair",
        description: r.issue_detail || "",
        assignedTo: r.assigned_to || r.form_filled_by || "",
      });
    });

    // Process Checklist
    (gridRawData.checklist as any[]).forEach((c) => {
      if (!c.task_start_date) return;
      events.push({
        id: `c-${c.task_id}`,
        title: c.name || "Checklist",
        date: toDateStr(c.task_start_date),
        status: deriveStatus(null, c.task_start_date, c.submission_date, null),
        type: "Checklist",
        description: c.task_description || "",
        // Prefer assigned_to if present, fallback to name
        assignedTo: c.assigned_to || c.name || "",
      });
    });

    // Process Delegation
    (gridRawData.delegation as any[]).forEach((d) => {
      if (!d.task_start_date) return;
      events.push({
        id: `d-${d.task_id}`,
        title: d.name || "Delegation",
        date: toDateStr(d.task_start_date),
        status: deriveStatus(
          d.status,
          d.task_start_date,
          d.submission_date,
          null,
        ),
        type: "Delegation",
        description: d.task_description || "",
        assignedTo: d.name || "",
      });
    });

    // Debug: Log all events before filtering
    console.log("All events before filtering:", events.length);
    console.log(
      "Events by date:",
      events.reduce(
        (acc, e) => {
          acc[e.date] = (acc[e.date] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    );

    // Apply user filter for the grid only
    let filteredEvents = events;

    // Apply user filter with better null handling
    if (!isAdmin && currentUsername) {
      filteredEvents = filteredEvents.filter((e) => checkNameMatch(e.assignedTo, currentUsername));
    }
    if (isAdmin && selectedUser) {
      filteredEvents = filteredEvents.filter((e) => checkNameMatch(e.assignedTo, selectedUser));
    }

    // Apply type filter - if no types selected, show all
    if (selectedTypes.length > 0 && selectedTypes.length < 4) {
      const beforeTypeFilter = filteredEvents.length;
      filteredEvents = filteredEvents.filter((e) =>
        selectedTypes.includes(e.type),
      );
      console.log(
        `Type filter (${selectedTypes.join(", ")}): ${beforeTypeFilter} -> ${filteredEvents.length}`,
      );
    } else if (selectedTypes.length === 0) {
      console.log("No types selected - showing 0 events");
      filteredEvents = [];
    }

    // Debug: Log filtered events by date
    console.log(
      "Filtered events by date:",
      filteredEvents.reduce(
        (acc, e) => {
          acc[e.date] = (acc[e.date] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    );

    return filteredEvents;
  }, [gridRawData, isAdmin, currentUsername, selectedUser, selectedTypes]);

  // ============ Build modal events ============
  const modalEvents = useMemo((): CalendarEvent[] => {
    if (!dayRawData) return [];
    const events: CalendarEvent[] = [];

    (dayRawData.maintenance as any[]).forEach((m) => {
      events.push({
        id: `m-${m.task_id}`,
        title: m.machine_name || "Maintenance",
        date: toDateStr(m.task_start_date),
        status: deriveStatus(m.status, m.task_start_date, null, m.actual_date),
        type: "Maintenance",
        description: m.task_description || "",
        assignedTo: m.doer_name || m.assigned_to || "",
      });
    });

    (dayRawData.repair as any[]).forEach((r) => {
      events.push({
        id: `r-${r.task_id}`,
        title: r.machine_name || "Repair",
        date: toDateStr(r.task_start_date),
        status: deriveStatus(r.status, r.task_start_date, null, r.actual_date),
        type: "Repair",
        description: r.issue_detail || "",
        assignedTo: r.assigned_to || r.form_filled_by || "",
      });
    });

    (dayRawData.checklist as any[]).forEach((c) => {
      events.push({
        id: `c-${c.task_id}`,
        title: c.name || "Checklist",
        date: toDateStr(c.task_start_date),
        status: deriveStatus(null, c.task_start_date, c.submission_date, null),
        type: "Checklist",
        description: c.task_description || "",
        assignedTo: c.name || "",
      });
    });

    (dayRawData.delegation as any[]).forEach((d) => {
      events.push({
        id: `d-${d.task_id}`,
        title: d.name || "Delegation",
        date: toDateStr(d.task_start_date),
        status: deriveStatus(
          d.status,
          d.task_start_date,
          d.submission_date,
          null,
        ),
        type: "Delegation",
        description: d.task_description || "",
        assignedTo: d.name || "",
      });
    });

    let filteredEvents = events;

    // Apply user filter
    if (!isAdmin && currentUsername) {
      filteredEvents = filteredEvents.filter((e) => checkNameMatch(e.assignedTo, currentUsername));
    }
    if (isAdmin && selectedUser) {
      filteredEvents = filteredEvents.filter((e) => checkNameMatch(e.assignedTo, selectedUser));
    }

    // Apply type filter
    if (selectedTypes.length > 0 && selectedTypes.length < 4) {
      filteredEvents = filteredEvents.filter((e) =>
        selectedTypes.includes(e.type),
      );
    } else if (selectedTypes.length === 0) {
      filteredEvents = [];
    }

    return filteredEvents;
  }, [dayRawData, isAdmin, currentUsername, selectedUser, selectedTypes]);

  // ============ Calendar helpers ============
  const getDayDateStr = (day: number): string => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    return `${year}-${month}-${dayStr}`;
  };

  const getGridTasksForDay = (day: number): CalendarEvent[] => {
    const dateStr = getDayDateStr(day);
    return gridEvents.filter((e) => e.date === dateStr);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const formatMonthYear = (date: Date) =>
    date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0,
  ).getDate();
  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1,
  ).getDay();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    for (let day = 1; day <= daysInMonth; day++) days.push(day);
    return days;
  }, [firstDayOfMonth, daysInMonth]);

  // ============ Weeks computation for week view ============
  const weeks = useMemo(() => {
    const weeksArray: (number | null)[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeksArray.push(calendarDays.slice(i, i + 7));
    }
    return weeksArray;
  }, [calendarDays]);

  // Set initial selected week to the week containing today's date
  useEffect(() => {
    if (weeks.length > 0) {
      const today = new Date();
      if (
        today.getMonth() === currentDate.getMonth() &&
        today.getFullYear() === currentDate.getFullYear()
      ) {
        const todayDay = today.getDate();
        for (let i = 0; i < weeks.length; i++) {
          if (weeks[i].includes(todayDay)) {
            setSelectedWeek(i);
            break;
          }
        }
      } else {
        setSelectedWeek(0);
      }
    }
  }, [weeks, currentDate]);

  const openDay = (day: number) => {
    const dateStr = getDayDateStr(day);
    const dayDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day,
    );
    const label = dayDate.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    setSelectedDate(dateStr);
    setSelectedDayLabel(label);
  };

  const closeModal = () => setSelectedDate(null);

  const groupedModal = {
    overdue: modalEvents.filter((t) => t.status === "overdue"),
    pending: modalEvents.filter((t) => t.status === "pending"),
    completed: modalEvents.filter((t) => t.status === "completed"),
  };

  const isLoading = isGridLoading || isRbacLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Access Denied. You do not have permission to view the Calendar.
      </div>
    );
  }

  // ============ Render ============
  return (
    <div className="p-6 pt-2 space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Master Calendar
          </h1>
          <p className="text-muted-foreground text-sm">
            Maintenance · Repair · Checklist · Delegation
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-700 rounded-xl">
            <div
              onClick={() => setViewMode("month")}
              className={`p-2 rounded-lg transition-all ${viewMode === "month"
                ? "bg-white dark:bg-neutral-800 shadow-sm text-primary"
                : "text-muted-foreground hover:bg-neutral-200 dark:hover:bg-neutral-600"
                }`}> Month view</div>
            <button
              onClick={() => setViewMode("month")}
              className={`p-2 rounded-lg transition-all ${viewMode === "month"
                ? "bg-white dark:bg-neutral-800 shadow-sm text-primary"
                : "text-muted-foreground hover:bg-neutral-200 dark:hover:bg-neutral-600"
                }`}
              title="Month view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`p-2 rounded-lg transition-all ${viewMode === "week"
                ? "bg-white dark:bg-neutral-800 shadow-sm text-primary"
                : "text-muted-foreground hover:bg-neutral-200 dark:hover:bg-neutral-600"
                }`}
              title="Week view"
            >
              <CalendarDays className="w-4 h-4" />
            </button>
            <div
              onClick={() => setViewMode("week")}
              className={`p-2 rounded-lg transition-all ${viewMode === "week"
                ? "bg-white dark:bg-neutral-800 shadow-sm text-primary"
                : "text-muted-foreground hover:bg-neutral-200 dark:hover:bg-neutral-600"
                }`}> Week view</div>
          </div>
          {/* Type Filter Dropdown */}
          <div ref={typeDropdownRef} className="relative">
            <button
              onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            >
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Type Filter</span>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform ${isTypeDropdownOpen ? "rotate-180" : ""
                  }`}
              />
            </button>

            {isTypeDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg z-10 overflow-hidden">
                <div className="p-3 border-b border-neutral-200 dark:border-neutral-700">
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllTypes}
                      className="text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearAllTypes}
                      className="text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                <div className="p-2 space-y-1">
                  {(
                    [
                      "Maintenance",
                      "Repair",
                      "Checklist",
                      "Delegation",
                    ] as EventType[]
                  ).map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(type)}
                        onChange={() => toggleTypeFilter(type)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span
                        className={`text-sm font-medium ${TYPE_CONFIG[type].color}`}
                      >
                        {type}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="p-3 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                  <div className="text-xs text-muted-foreground">
                    Showing: {selectedTypes.length} type
                    {selectedTypes.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Admin user filter */}
          {isAdmin && (
            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-sm">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="bg-transparent text-sm text-foreground outline-none min-w-36 cursor-pointer"
              >
                <option
                  className="text-black bg-white dark:text-white dark:bg-zinc-800"
                  value=""
                >
                  All Users (Grid View)
                </option>
                {usersData.map((u: any) => (
                  <option
                    className="text-black bg-white dark:text-white dark:bg-zinc-800"
                    key={u.id}
                    value={u.user_name}
                  >
                    {u.user_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {selectedTypes.length < 4 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          {selectedTypes.map((type) => (
            <span
              key={type}
              className={`text-xs px-2 py-1 rounded-full ${TYPE_CONFIG[type].bg} ${TYPE_CONFIG[type].darkBg} ${TYPE_CONFIG[type].color} border border-current/20`}
            >
              {type}
            </span>
          ))}
        </div>
      )}

      {/* Calendar Card */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        {/* Month Nav + Week Selector (for week view) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <button
            onClick={() => {
              setCurrentDate(
                new Date(
                  currentDate.getFullYear(),
                  currentDate.getMonth() - 1,
                  1,
                ),
              );
              if (viewMode === "week") setSelectedWeek(0);
            }}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-foreground">
              {formatMonthYear(currentDate)}
            </h2>
            <button
              onClick={() => {
                setCurrentDate(new Date());
                if (viewMode === "week") {
                  // reset week to current week (handled by useEffect)
                }
              }}
              className="px-3 py-1 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 rounded-lg hover:bg-green-100 transition-colors"
            >
              Today
            </button>
          </div>

          <button
            onClick={() => {
              setCurrentDate(
                new Date(
                  currentDate.getFullYear(),
                  currentDate.getMonth() + 1,
                  1,
                ),
              );
              if (viewMode === "week") setSelectedWeek(0);
            }}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Week Selector (visible only in week view) */}
        {viewMode === "week" && weeks.length > 0 && (
          <div className="px-6 pt-3 pb-2 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Week of month:</span>
              <div className="flex gap-2">
                {weeks.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedWeek(idx)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${selectedWeek === idx
                      ? "bg-primary text-white dark:bg-primary"
                      : "bg-neutral-100 dark:bg-neutral-700 text-foreground hover:bg-neutral-200 dark:hover:bg-neutral-600"
                      }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Calendar Content */}
        {viewMode === "month" ? (
          <>
            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-neutral-200 dark:border-neutral-700">
              {dayNames.map((d) => (
                <div
                  key={d}
                  className="px-2 py-3 text-center text-xs font-medium text-muted-foreground uppercase"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, index) => {
                const tasksForDay = day ? getGridTasksForDay(day) : [];
                const overdueCount = tasksForDay.filter(
                  (t) => t.status === "overdue",
                ).length;
                const pendingCount = tasksForDay.filter(
                  (t) => t.status === "pending",
                ).length;
                const completedCount = tasksForDay.filter(
                  (t) => t.status === "completed",
                ).length;
                // Always show up to 3 tasks to keep the grid populated
                const visible = tasksForDay.slice(0, 3);
                const extra = tasksForDay.length - 3;

                return (
                  <div
                    key={index}
                    onClick={() => day && openDay(day)}
                    className={`min-h-[120px] p-2 border-b border-r border-neutral-200 dark:border-neutral-700 transition-colors ${!day
                      ? "bg-neutral-50 dark:bg-neutral-900/50 cursor-default"
                      : "cursor-pointer hover:bg-blue-50/30 dark:hover:bg-neutral-800/60"
                      } ${isToday(day || 0) ? "bg-green-50 dark:bg-green-900/20" : ""
                      }`}
                  >
                    {day && (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={
                              isToday(day)
                                ? "w-6 h-6 flex items-center justify-center rounded-full bg-green-500 text-white text-xs font-bold"
                                : "text-sm font-semibold text-foreground"
                            }
                          >
                            {day}
                          </span>
                          {tasksForDay.length > 0 && (
                            <div className="flex gap-0.5">
                              {overdueCount > 0 && (
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              )}
                              {pendingCount > 0 && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              )}
                              {completedCount > 0 && (
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              )}
                            </div>
                          )}
                        </div>

                        <div className="space-y-0.5">
                          {visible.map((event) => {
                            const tc = TYPE_CONFIG[event.type];
                            const sc = STATUS_CONFIG[event.status];
                            return (
                              <div
                                key={event.id}
                                className={`px-1.5 py-0.5 text-[10px] sm:text-[11px] rounded truncate border ${tc.bg} ${tc.darkBg} ${tc.color} ${sc.border}`}
                                title={`[${event.type}] ${event.title}: ${event.description}`}
                              >
                                <span className="font-bold mr-0.5">
                                  {tc.letter}
                                </span>
                                {event.title}
                              </div>
                            );
                          })}
                          {extra > 0 && (
                            <div className="text-[10px] text-primary font-bold pl-1 mt-1">
                              +{extra} more — click to see all
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          // Week View – Enhanced with description and larger cells
          <>
            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-neutral-200 dark:border-neutral-700">
              {dayNames.map((d) => (
                <div
                  key={d}
                  className="px-2 py-3 text-center text-xs font-medium text-muted-foreground uppercase"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Week Row – with larger min-width columns */}
            <div
              className="grid grid-cols-7"
              style={{ gridTemplateColumns: "repeat(7, minmax(160px, 1fr))" }}
            >
              {weeks[selectedWeek]?.map((day, idx) => {
                const tasksForDay = day ? getGridTasksForDay(day) : [];
                const overdueCount = tasksForDay.filter(
                  (t) => t.status === "overdue",
                ).length;
                const pendingCount = tasksForDay.filter(
                  (t) => t.status === "pending",
                ).length;
                const completedCount = tasksForDay.filter(
                  (t) => t.status === "completed",
                ).length;
                // Show up to 3 tasks per day, but each now includes a description line
                const visible = tasksForDay.slice(0, 7);
                const extra = tasksForDay.length - 3;

                return (
                  <div
                    key={idx}
                    onClick={() => day && openDay(day)}
                    className={`min-h-[250px] p-2 border-b border-r border-neutral-200 dark:border-neutral-700 transition-colors ${!day
                      ? "bg-neutral-50 dark:bg-neutral-900/50 cursor-default"
                      : "cursor-pointer hover:bg-blue-50/30 dark:hover:bg-neutral-800/60"
                      } ${isToday(day || 0) ? "bg-green-50 dark:bg-green-900/20" : ""
                      }`}
                  >
                    {day && (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={
                              isToday(day)
                                ? "w-6 h-6 flex items-center justify-center rounded-full bg-green-500 text-white text-xs font-bold"
                                : "text-sm font-semibold text-foreground"
                            }
                          >
                            {day}
                          </span>
                          {tasksForDay.length > 0 && (
                            <div className="flex gap-0.5">
                              {overdueCount > 0 && (
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                              )}
                              {pendingCount > 0 && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              )}
                              {completedCount > 0 && (
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              )}
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          {visible.map((event) => {
                            const tc = TYPE_CONFIG[event.type];
                            const sc = STATUS_CONFIG[event.status];
                            return (
                              <div
                                key={event.id}
                                className={`px-1.5 py-1 rounded border text-[10px] sm:text-[11px] ${tc.bg} ${tc.darkBg} ${tc.color} ${sc.border}`}
                                title={`[${event.type}] ${event.title}: ${event.description}`}
                              >
                                <div className="flex items-center gap-0.5 truncate font-medium">
                                  <span className="font-bold">{tc.letter}</span>
                                  <span className="truncate">{event.title}</span>
                                </div>
                                {event.description && (
                                  <div className="text-[9px] truncate opacity-80 mt-0.5">
                                    {event.description}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {extra > 0 && (
                            <div className="text-[10px] text-primary font-bold pl-1 mt-1">
                              +{extra} more
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        {(
          ["Maintenance", "Repair", "Checklist", "Delegation"] as EventType[]
        ).map((t) => (
          <div key={t} className="flex items-center gap-1.5">
            <span
              className={`w-4 h-4 rounded-sm text-[9px] font-bold flex items-center justify-center ${TYPE_CONFIG[t].bg} ${TYPE_CONFIG[t].darkBg} ${TYPE_CONFIG[t].color} border border-current/20`}
            >
              {TYPE_CONFIG[t].letter}
            </span>
            <span className="text-muted-foreground">{t}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-4">
          <span className="flex items-center gap-1 text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Overdue
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Pending
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Completed
          </span>
        </div>
      </div>

      {/* ============ Day Detail Modal ============ */}
      {selectedDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-neutral-200 dark:border-neutral-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground leading-tight">
                    {selectedDayLabel}
                  </h3>
                  {isDayLoading ? (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Loading tasks…
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {modalEvents.length} task
                      {modalEvents.length !== 1 ? "s" : ""} shown
                      {(!selectedUser || selectedTypes.length < 4) && (
                        <span className="text-muted-foreground/60">
                          {" "}
                          (filtered)
                        </span>
                      )}
                      {groupedModal.overdue.length > 0 && (
                        <span className="ml-1 text-red-500 font-semibold">
                          · {groupedModal.overdue.length} overdue
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {isDayLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Fetching all tasks for this date…
                  </p>
                </div>
              ) : modalEvents.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-sm">
                  No tasks scheduled for this day.
                </div>
              ) : (
                (["overdue", "pending", "completed"] as EventStatus[]).map(
                  (status) => {
                    const group = groupedModal[status];
                    if (!group.length) return null;
                    const sc = STATUS_CONFIG[status];
                    const Icon = sc.icon;

                    return (
                      <div key={status}>
                        <div
                          className={`flex items-center gap-2 mb-3 pb-2 border-b ${sc.border}`}
                        >
                          <Icon className={`w-4 h-4 ${sc.text}`} />
                          <span className={`text-sm font-semibold ${sc.text}`}>
                            {sc.label}
                          </span>
                          <span
                            className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}
                          >
                            {group.length}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {group.map((event) => {
                            const tc = TYPE_CONFIG[event.type];
                            return (
                              <div
                                key={event.id}
                                className={`flex items-start gap-3 p-3 rounded-xl border ${sc.border} ${sc.bg}`}
                              >
                                <div
                                  className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold ${tc.bg} ${tc.darkBg} ${tc.color}`}
                                >
                                  {tc.letter}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${tc.bg} ${tc.darkBg} ${tc.color}`}
                                    >
                                      {event.type}
                                    </span>
                                  </div>
                                  <h4 className="text-sm font-semibold text-foreground mt-1 truncate">
                                    {event.title}
                                  </h4>
                                  {event.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                      {event.description}
                                    </p>
                                  )}
                                  {event.assignedTo && (
                                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {event.assignedTo}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  },
                )
              )}
            </div>

            {/* Modal Footer */}
            {!isDayLoading && (
              <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-50/50 dark:bg-neutral-800/30">
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    {groupedModal.overdue.length} overdue
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    {groupedModal.pending.length} pending
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    {groupedModal.completed.length} completed
                  </span>
                </div>
                <button
                  onClick={closeModal}
                  className="px-5 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-foreground text-sm font-semibold rounded-xl transition-all"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}