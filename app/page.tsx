"use client"

import { useState, useEffect } from "react"
import { DynamicSidebar } from "@/components/dynamic-sidebar"
import { TableView } from "@/components/table-view"
import { DatabaseInit } from "@/components/database-init"
import { SidebarProvider } from "@/components/ui/sidebar"

export default function HomePage() {
  const [selectedItem, setSelectedItem] = useState<{
    id: number
    name: string
    type: "folder" | "table"
  } | null>(null)
  const [showDatabaseInit, setShowDatabaseInit] = useState(false)

  // Check if database needs initialization
  useEffect(() => {
    const checkDatabase = async () => {
      try {
        const response = await fetch("/api/sidebar")
        if (!response.ok) {
          const errorText = await response.text()
          if (errorText.includes("schema cache") || errorText.includes("does not exist")) {
            setShowDatabaseInit(true)
          }
        }
      } catch (error) {
        console.error("Error checking database:", error)
      }
    }

    checkDatabase()
  }, [])

  if (showDatabaseInit) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <DatabaseInit />
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        <DynamicSidebar selectedItem={selectedItem} onItemSelect={setSelectedItem} />
        <main className="flex-1 overflow-hidden">
          {selectedItem?.type === "table" ? (
            <TableView itemId={selectedItem.id} itemName={selectedItem.name} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-2">Dynamic Database Manager</h2>
                <p>Select a table from the sidebar to view and edit data</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </SidebarProvider>
  )
}
