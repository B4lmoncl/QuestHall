import { NextResponse } from "next/server";
import agents from "@/data/agents.json";

export async function GET() {
  return NextResponse.json({ agents, total: agents.length });
}
