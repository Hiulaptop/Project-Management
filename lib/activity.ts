import db from "@/lib/db";

export async function logActivity(
  projectId: bigint,
  userId: string,
  action: string,
  details: string
): Promise<void> {
  try {
    await db.activityLog.create({
      data: {
        project_id: projectId,
        user_id: userId,
        action,
        details,
      },
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
    // Non-critical — don't throw
  }
}
