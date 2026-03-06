import { NextResponse } from "next/server";
import quests from "@/data/quests.json";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId");
  const status = searchParams.get("status");

  let filtered = quests;
  if (agentId) filtered = filtered.filter((q) => q.agentId === agentId);
  if (status) filtered = filtered.filter((q) => q.status === status);

  return NextResponse.json({ quests: filtered, total: filtered.length });
}
