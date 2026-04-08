import supabase from "@/utils/supabaseClient";

export interface LogMaintenanceParams {
  maintenanceId: string;
  action: string;
  machine: string;
  givenBy: string;
  doer: string;
  frequency?: string;
  fromDate?: string;
  taskDescription: string;
}

export const logMaintenanceAction = async (paramsArray: LogMaintenanceParams[]) => {
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
      maintenance_id: params.maintenanceId,
      action: params.action,
      action_done_by: actionDoneBy,
      machine: params.machine,
      given_by: params.givenBy,
      doer: params.doer,
      frequency: params.frequency || null,
      from_date: params.fromDate ? params.fromDate.split("T")[0] : null,
      task_description: params.taskDescription,
    }));

    const { error } = await supabase.from("log_maintenance").insert(insertDataArray);

    if (error) {
      console.error("Error logging maintenance action:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Exception logging maintenance action:", error);
    return false;
  }
};
