import { NextResponse } from "next/server";
import currentQuests from "@/data/current-quests.json";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId");

  let filtered = currentQuests;
  if (agentId) filtered = filtered.filter((q) => q.agentId === agentId);

  return NextResponse.json({ quests: filtered, total: filtered.length });
}
