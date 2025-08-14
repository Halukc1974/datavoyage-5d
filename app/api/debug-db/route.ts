import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
  try {
    console.log("Environment variables check:")
    console.log(
      "SUPABASE_SUPABASE_NEXT_PUBLIC_SUPABASE_URL:",
      process.env.SUPABASE_NEXT_PUBLIC_SUPABASE_URL ? "exists" : "missing",
    )
    console.log(
      "SUPABASE_SUPABASE_SERVICE_ROLE_KEY:",
      process.env.SUPABASE_SUPABASE_SERVICE_ROLE_KEY ? "exists" : "missing",
    )
    console.log("SUPABASE_SUPABASE_ANON_KEY:", process.env.SUPABASE_SUPABASE_ANON_KEY ? "exists" : "missing")

    // Try to create Supabase client
    const supabaseUrl = process.env.SUPABASE_NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          error: "Missing Supabase environment variables",
          supabaseUrl: supabaseUrl ? "exists" : "missing",
          supabaseKey: supabaseKey ? "exists" : "missing",
        },
        { status: 500 },
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Test database connection
    const { data, error } = await supabase.from("sidebar_items").select("*").limit(1)

    if (error) {
      return NextResponse.json(
        {
          error: "Database query failed",
          details: error.message,
          supabaseUrl: supabaseUrl,
          hasKey: !!supabaseKey,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      sampleData: data,
      envVars: {
        supabaseUrl: supabaseUrl ? "exists" : "missing",
        supabaseKey: supabaseKey ? "exists" : "missing",
      },
    })
  } catch (error) {
    console.error("Debug endpoint error:", error)
    return NextResponse.json(
      {
        error: "Debug endpoint failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
