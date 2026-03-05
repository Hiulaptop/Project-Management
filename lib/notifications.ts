import db from "@/lib/db";
import { NotificationType } from "@/prisma/generated/prisma/client";

interface CreateNotificationParams {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    fromUserId?: string;
    projectId?: bigint;
    deadlineId?: bigint;
}

export async function createNotification({
    userId,
    type,
    title,
    message,
    fromUserId,
    projectId,
    deadlineId,
}: CreateNotificationParams) {
    return db.notification.create({
        data: {
            user_id: userId,
            type,
            title,
            message,
            from_user_id: fromUserId || null,
            project_id: projectId || null,
            deadline_id: deadlineId || null,
        },
    });
}

export async function createBulkNotifications(
    userIds: string[],
    params: Omit<CreateNotificationParams, "userId">
) {
    return db.notification.createMany({
        data: userIds.map((userId) => ({
            user_id: userId,
            type: params.type,
            title: params.title,
            message: params.message,
            from_user_id: params.fromUserId || null,
            project_id: params.projectId || null,
            deadline_id: params.deadlineId || null,
        })),
    });
}