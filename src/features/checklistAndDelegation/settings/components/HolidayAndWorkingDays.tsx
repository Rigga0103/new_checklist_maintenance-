"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit, Popcorn } from "lucide-react";
import supabase from "@/utils/supabaseClient";
import { toast } from "sonner";

export default function HolidayAndWorkingDays() {
    const [activeTab, setActiveTab] = useState<"holiday" | "working">("holiday");
    const [showHolidayModal, setShowHolidayModal] = useState(false);
    const [showWorkingModal, setShowWorkingModal] = useState(false);

    const [holidays, setHolidays] = useState<any[]>([]);
    const [workingDays, setWorkingDays] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [selectedMonth, setSelectedMonth] = useState("All Months");
    const [selectedYear, setSelectedYear] = useState("All Years");

    // Form states
    const [holidayForm, setHolidayForm] = useState({
        id: null,
        leave_date: "",
        reason: "",
    });

    const [workingForm, setWorkingForm] = useState({
        id: null,
        working_date: "",
        day: "",
    });

    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const getDayFromDate = (dateString: string) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return daysOfWeek[date.getDay()];
    };

    const formatNativeDate = (dateString: string) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return `${date.getDate().toString().padStart(2, "0")}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getFullYear()}`;
    };

    const getMonthName = (monthIndex: number) => {
        const date = new Date(2000, monthIndex, 1);
        return date.toLocaleString('default', { month: 'long' });
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === "holiday") {
                const { data, error } = await supabase.from("holidays").select("*").order("leave_date", { ascending: true });
                if (error) console.error("Error fetching holidays:", error);
                else setHolidays(data || []);
            } else {
                const { data, error } = await supabase.from("working_day_calender").select("*").order("working_date", { ascending: true });
                if (error) console.error("Error fetching working days:", error);
                else setWorkingDays(data || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveHoliday = async () => {
        if (!holidayForm.leave_date || !holidayForm.reason) {
            toast.error("Please fill all fields");
            return;
        }
        const payload = {
            leave_date: holidayForm.leave_date,
            reason: holidayForm.reason,
        };
        try {
            if (holidayForm.id) {
                await supabase.from("holidays").update(payload).eq("id", holidayForm.id);
                toast.success("Holiday updated");
            } else {
                await supabase.from("holidays").insert([payload]);
                toast.success("Holiday added");
            }
            setShowHolidayModal(false);
            setHolidayForm({ id: null, leave_date: "", reason: "" });
            fetchData();
        } catch (e: any) {
            toast.error(e.message || "Something went wrong");
        }
    };

    const handleSaveWorkingDay = async () => {
        if (!workingForm.working_date || !workingForm.day) {
            toast.error("Please fill all fields");
            return;
        }
        const payload = {
            working_date: workingForm.working_date,
            day: workingForm.day,
        };
        try {
            if (workingForm.id) {
                await supabase.from("working_day_calender").update(payload).eq("id", workingForm.id);
                toast.success("Working day updated");
            } else {
                await supabase.from("working_day_calender").insert([payload]);
                toast.success("Working day added");
            }
            setShowWorkingModal(false);
            setWorkingForm({ id: null, working_date: "", day: "" });
            fetchData();
        } catch (e: any) {
            toast.error(e.message || "Something went wrong");
        }
    };

    const openEditHoliday = (item: any) => {
        setHolidayForm({ id: item.id, leave_date: item.leave_date, reason: item.reason });
        setShowHolidayModal(true);
    };

    const openEditWorkingDay = (item: any) => {
        setWorkingForm({ id: item.id, working_date: item.working_date, day: item.day });
        setShowWorkingModal(true);
    };

    const filteredHolidays = holidays.filter((h) => {
        if (!h.leave_date) return false;
        const d = new Date(h.leave_date);
        const m = (d.getMonth() + 1).toString();
        const y = d.getFullYear().toString();

        if (selectedMonth !== "All Months" && m !== selectedMonth) return false;
        if (selectedYear !== "All Years" && y !== selectedYear) return false;
        return true;
    });

    const filteredWorkingDays = workingDays.filter((w) => {
        if (!w.working_date) return false;
        const d = new Date(w.working_date);
        const m = (d.getMonth() + 1).toString();
        const y = d.getFullYear().toString();

        if (selectedMonth !== "All Months" && m !== selectedMonth) return false;
        if (selectedYear !== "All Years" && y !== selectedYear) return false;
        return true;
    });

    // UI styling based on screenshot layout
    return (
        <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 min-h-[500px]">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-900 dark:text-white">
                    <PartyIcon /> Holiday List
                </h2>
                <div className="flex gap-3">
                    {activeTab === "holiday" ? (
                        <>
                            <button
                                onClick={() => {
                                    setHolidayForm({ id: null, leave_date: "", reason: "" });
                                    setShowHolidayModal(true);
                                }}
                                className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors"
                            >
                                + Add Holiday
                            </button>
                            <button
                                onClick={() => setActiveTab("working")}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors"
                            >
                                + Working Days
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setActiveTab("holiday")}
                                className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors"
                            >
                                Show Holiday List
                            </button>
                            <button
                                onClick={() => {
                                    setWorkingForm({ id: null, working_date: "", day: "" });
                                    setShowWorkingModal(true);
                                }}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors"
                            >
                                + Add Working Day
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="bg-pink-50 dark:bg-neutral-900/50 rounded-lg overflow-hidden border border-pink-100 dark:border-neutral-700">
                <div className="flex justify-between items-center px-4 py-3 border-b border-pink-100 dark:border-neutral-700 bg-pink-100/50 dark:bg-neutral-800">
                    <h3 className="font-medium text-purple-700 dark:text-white flex items-center gap-2 text-sm">
                        {activeTab === "holiday" ? "Holiday Records" : " Working Days Records"}
                    </h3>
                    <div className="flex gap-2">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="text-xs border-gray-300 dark:border-neutral-600 rounded-md py-1 bg-white dark:bg-neutral-800 text-foreground"
                        >
                            <option>All Months</option>
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i} value={i + 1}>{getMonthName(i)}</option>
                            ))}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="text-xs border-gray-300 dark:border-neutral-600 rounded-md py-1 bg-white dark:bg-neutral-800 text-foreground"
                        >
                            <option>All Years</option>
                            {Array.from({ length: 5 }, (_, i) => {
                                const year = new Date().getFullYear() - 2 + i;
                                return <option key={year} value={year}>{year}</option>;
                            })}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto overflow-y-auto max-h-[500px] min-h-[300px]">
                    {loading ? (
                        <div className="flex justify-center items-center h-48">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="sticky top-0 z-10 text-xs text-gray-500 uppercase bg-gray-50/50 dark:bg-neutral-800/50 border-b border-gray-200 dark:border-neutral-700">
                                <tr>
                                    <th className="px-6 py-3 font-medium text-center w-16">#</th>
                                    {activeTab === "holiday" ? (
                                        <>
                                            <th className="px-6 py-3 font-medium text-center">DAY</th>
                                            <th className="px-6 py-3 font-medium text-center">DATE</th>
                                            <th className="px-6 py-3 font-medium text-center">HOLIDAY NAME</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="px-6 py-3 font-medium text-center">WORKING DATE</th>
                                            <th className="px-6 py-3 font-medium text-center">DAY</th>
                                        </>
                                    )}
                                    <th className="px-6 py-3 font-medium text-center">ACTION</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                                {activeTab === "holiday" && filteredHolidays.length === 0 && (
                                    <tr><td colSpan={5} className="text-center py-8 text-gray-500">No holidays found</td></tr>
                                )}
                                {activeTab === "holiday" &&
                                    filteredHolidays.map((h, i) => (
                                        <tr key={h.id} className="bg-white dark:bg-neutral-900 border-b dark:border-neutral-800 hover:bg-gray-50/50 dark:hover:bg-neutral-800/50">
                                            <td className="px-6 py-4 text-center text-gray-500">{i + 1}</td>
                                            <td className="px-6 py-4 text-center">{getDayFromDate(h.leave_date)}</td>
                                            <td className="px-6 py-4 text-center">{formatNativeDate(h.leave_date)}</td>
                                            <td className="px-6 py-4 text-center">{h.reason}</td>
                                            <td className="px-6 py-4 flex justify-center">
                                                <button onClick={() => openEditHoliday(h)} className="text-green-600 hover:text-green-700"><Edit size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}

                                {activeTab === "working" && filteredWorkingDays.length === 0 && (
                                    <tr><td colSpan={4} className="text-center py-8 text-gray-500">No working days found</td></tr>
                                )}
                                {activeTab === "working" &&
                                    filteredWorkingDays.map((w, i) => (
                                        <tr key={w.id} className="bg-white dark:bg-neutral-900 border-b dark:border-neutral-800 hover:bg-gray-50/50 dark:hover:bg-neutral-800/50">
                                            <td className="px-6 py-4 text-center text-gray-500">{i + 1}</td>
                                            <td className="px-6 py-4 text-center">{formatNativeDate(w.working_date)}</td>
                                            <td className="px-6 py-4 text-center">{w.day}</td>
                                            <td className="px-6 py-4 flex justify-center">
                                                <button onClick={() => openEditWorkingDay(w)} className="text-green-600 hover:text-green-700"><Edit size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Holiday Modal */}
            {showHolidayModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg w-full max-w-md p-6">
                        <h3 className="text-lg font-semibold mb-4 text-foreground">
                            {holidayForm.id ? "Edit Holiday" : "Add Holiday"}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Date</label>
                                <input
                                    type="date"
                                    value={holidayForm.leave_date}
                                    onChange={(e) => setHolidayForm({ ...holidayForm, leave_date: e.target.value })}
                                    className="w-full border border-gray-300 dark:border-neutral-600 rounded-md p-2 text-sm bg-white dark:bg-neutral-900 text-foreground"
                                />
                                {holidayForm.leave_date && (
                                    <p className="text-xs text-gray-500 mt-1">Day: {getDayFromDate(holidayForm.leave_date)}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Holiday Name / Reason</label>
                                <input
                                    type="text"
                                    placeholder="e.g., New Year, Christmas, Diwali"
                                    value={holidayForm.reason}
                                    onChange={(e) => setHolidayForm({ ...holidayForm, reason: e.target.value })}
                                    className="w-full border border-gray-300 dark:border-neutral-600 rounded-md p-2 text-sm bg-white dark:bg-neutral-900 text-foreground"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowHolidayModal(false)}
                                className="px-4 py-2 border border-gray-300 dark:border-neutral-600 text-gray-600 dark:text-gray-300 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-neutral-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveHoliday}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Working Day Modal */}
            {showWorkingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg w-full max-w-md p-6">
                        <h3 className="text-lg font-semibold mb-4 text-foreground">
                            {workingForm.id ? "Edit Working Day" : "Add Working Day"}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Working Date</label>
                                <input
                                    type="date"
                                    value={workingForm.working_date}
                                    onChange={(e) => setWorkingForm({ ...workingForm, working_date: e.target.value })}
                                    className="w-full border border-gray-300 dark:border-neutral-600 rounded-md p-2 text-sm bg-white dark:bg-neutral-900 text-foreground"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Day (Hindi)</label>
                                <input
                                    type="text"
                                    placeholder="e.g., शुक्रवार, शनिवार"
                                    value={workingForm.day}
                                    onChange={(e) => setWorkingForm({ ...workingForm, day: e.target.value })}
                                    className="w-full border border-gray-300 dark:border-neutral-600 rounded-md p-2 text-sm bg-white dark:bg-neutral-900 text-foreground"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowWorkingModal(false)}
                                className="px-4 py-2 border border-gray-300 dark:border-neutral-600 text-gray-600 dark:text-gray-300 rounded-md text-sm hover:bg-gray-50 dark:hover:bg-neutral-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveWorkingDay}
                                className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function PartyIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    );
}
