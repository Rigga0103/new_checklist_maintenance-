import supabase from "@/utils/supabaseClient";

export interface LogChecklistParams {
  checklistId: string;
  action: string;
  department: string;
  givenBy: string;
  doerName: string;
  frequency?: string;
  fromDate?: string;
  endDate?: string;
  description: string;
}

export const logChecklistAction = async (paramsArray: LogChecklistParams[]) => {
  try {
    const userName =
      typeof window !== "undefined" ? localStorage.getItem("user-name") : null;

    let actionDoneBy = userName || "System";

    // Fetch the name of the user from users table
    if (userName) {
      const { data: userData, error } = await supabase
        .from("users")
        .select("user_name")
        .eq("user_name", userName)
        .single();

      if (userData && !error) {
        actionDoneBy = userData.user_name;
      }
    }

    const insertDataArray = paramsArray.map(params => ({
      "checklist id": params.checklistId,
      action: params.action,
      "action done by": actionDoneBy,
      department: params.department,
      "given by": params.givenBy,
      "doer name": params.doerName,
      frequency: params.frequency || null,
      "from date": params.fromDate ? params.fromDate.split("T")[0] : null,
      "end date": params.endDate ? params.endDate.split("T")[0] : null,
      description: params.description,
    }));

    const { error } = await supabase.from("log_checklist").insert(insertDataArray);

    if (error) {
      console.error("Error logging checklist action:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Exception logging checklist action:", error);
    return false;
  }
};
