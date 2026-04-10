import supabase from "@/utils/supabaseClient";

export interface DelegationLogData {
  task_id: string;
  action: "update" | "delete";
  action_done_by: string;
  name?: string;
  task_description?: string;
  frequency?: string;
}

/**
 * Logs an action (update or delete) performed on a delegation task.
 */
export const logDelegationAction = async (logData: DelegationLogData) => {
  try {
    const userNameFromStorage =
      typeof window !== "undefined" ? localStorage.getItem("user-name") : null;

    let actionDoneBy = logData.action_done_by || userNameFromStorage || "System";

    // Fetch the name of the user from users table to ensure it exists (matching pattern in logMaintenanceApi)
    if (userNameFromStorage) {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("user_name")
        .eq("user_name", userNameFromStorage)
        .single();

      if (userData && !userError) {
        actionDoneBy = userData.user_name;
      }
    }

    const { error } = await supabase.from("log_delegation").insert([
      {
        task_id: logData.task_id.toString(),
        action: logData.action,
        action_done_by: actionDoneBy,
        name: logData.name,
        task_description: logData.task_description,
        frequency: logData.frequency,
      },
    ]);

    if (error) {
      console.error("Error logging delegation action:", error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error("Exception in logDelegationAction:", error);
    return { success: false, error };
  }
};
