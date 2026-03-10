import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { serializeBigInt } from "@/lib/json";

// PATCH /api/projects/:id/members/:userId — Update member role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
): Promise<NextResponse> {
  try {
    const session = await getAuthUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, userId } = await params;
    const projectId = BigInt(id);

    // Only OWNER can change roles
    const membership = await db.project_members.findUnique({
      where: {
        project_id_user_id: {
          project_id: projectId,
          user_id: session.userId,
        },
      },
    });

    if (!membership || membership.role_in_project !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Can't change own role
    if (userId === session.userId) {
      return NextResponse.json(
        { error: "Cannot change your own role" },
        { status: 400 }
      );
    }

    const { role_in_project } = await request.json();

    if (!role_in_project || !["MANAGER", "MEMBER"].includes(role_in_project)) {
      return NextResponse.json(
        { error: "Invalid role. Must be MANAGER or MEMBER" },
        { status: 400 }
      );
    }

    const updated = await db.project_members.update({
      where: {
        project_id_user_id: {
          project_id: projectId,
          user_id: userId,
        },
      },
      data: { role_in_project },
      include: {
        user: {
          select: { id: true, fullname: true, username: true },
        },
      },
    });

    return NextResponse.json(
      { message: "Role updated successfully", member: serializeBigInt(updated) },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update role error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/:id/members/:userId — Remove member
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
): Promise<NextResponse> {
  try {
    const session = await getAuthUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, userId } = await params;
    const projectId = BigInt(id);

    // Only OWNER or MANAGER can remove (or user removing themselves)
    const membership = await db.project_members.findUnique({
      where: {
        project_id_user_id: {
          project_id: projectId,
          user_id: session.userId,
        },
      },
    });

    const isSelf = userId === session.userId;

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isSelf && membership.role_in_project === "MEMBER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Can't remove the OWNER
    const targetMember = await db.project_members.findUnique({
      where: {
        project_id_user_id: {
          project_id: projectId,
          user_id: userId,
        },
      },
    });

    if (!targetMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (targetMember.role_in_project === "OWNER") {
      return NextResponse.json(
        { error: "Cannot remove the project owner" },
        { status: 400 }
      );
    }

    await db.project_members.delete({
      where: {
        project_id_user_id: {
          project_id: projectId,
          user_id: userId,
        },
      },
    });

    return NextResponse.json(
      { message: "Member removed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Remove member error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}