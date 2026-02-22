import { NextResponse } from "next/server";
import { verifyMlbbId } from "@/lib/mlbb";
import { getAuthSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { mlbbId, serverId } = await req.json();

    if (!mlbbId || !serverId) {
      return new NextResponse("Missing MLBB ID or Server ID", { status: 400 });
    }

    const result = await verifyMlbbId(mlbbId, serverId);

    if (result.success) {
      return NextResponse.json({ ign: result.ign });
    } else {
      return NextResponse.json({ error: result.error || "Player not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("[MLBB_VERIFY_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
