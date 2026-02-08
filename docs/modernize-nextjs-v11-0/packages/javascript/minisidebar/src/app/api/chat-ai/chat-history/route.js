
import { chatHistory } from "./history";
import { NextResponse } from "next/server";


export async function GET(req) {
  try {
    return NextResponse.json({
      status: 200,
      data: chatHistory,
    });
  } catch {
    return NextResponse.json({
      status: 500,
      msg: "Error fetching questions",
    });
  }
}
