import { NextResponse } from "next/server";
  import { readSheet } from "@/lib/excel-store";

  export async function GET() {
      try {
          const users = await readSheet("taikhoan");
          const sales = users
              .filter((u) => {
                  const role = String(u.role || "").trim().toLowerCase();
                  return role === "sale" || role === "admin";
              })
              .map((u) => ({
                  username: String(u.username || ""),
                  name: String(u.fullname || u.name || u.username || "")
              }))
              .filter(u => u.username);
          return NextResponse.json({ success: true, sales });
      } catch (error) {
          console.error("Failed to fetch sales list:", error);
          return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 });
      }
  }
