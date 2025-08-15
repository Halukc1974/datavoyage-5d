"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { toast } from "@/hooks/use-toast"
import { Plus, Settings, Trash2 } from "lucide-react"
// Removed unused DateTime import

// Allow assigning Tabulator to window in the browser without TS errors
declare global {
  interface Window {
    Tabulator?: any
  }
}


interface TableViewProps {
  itemId: number
  itemName: string
}

interface Column {
  id: number
  // `column_name` is the DB key; `display_name` is the human label. Older code used `name`.
  column_name?: string
  display_name?: string
  // Backwards-compatible alias for display_name
  name?: string
  data_type: string
  is_required: boolean
  default_value?: string
  sort_order: number
}

interface TableData {
  id: number
  data: Record<string, any>
}

export function TableView({ itemId, itemName }: TableViewProps) {
  const [columns, setColumns] = useState<Column[]>([])
  const [tableData, setTableData] = useState<TableData[]>([])
  const [loading, setLoading] = useState(true)
  const [showColumnDialog, setShowColumnDialog] = useState(false)
  const [editingColumn, setEditingColumn] = useState<Column | null>(null)
  const [newColumn, setNewColumn] = useState({
    name: "",
    data_type: "text",
    is_required: false,
    default_value: "",
  })
  const tabulatorRef = useRef<any>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  // Load Tabulator dynamically
  useEffect(() => {
    const loadTabulator = async () => {
      if (typeof window !== "undefined") {
        // Safely override console.error to suppress noisy ResizeObserver messages.
        const originalError = typeof window.console.error === "function" ? window.console.error.bind(window.console) : (..._args: any[]) => {}
        window.console.error = (...args: any[]) => {
          try {
            if (
              args[0] &&
              typeof args[0] === "string" &&
              args[0].includes("ResizeObserver loop completed with undelivered notifications")
            ) {
              // Suppress ResizeObserver errors as they're usually harmless
              return
            }
          } catch (e) {
            // ignore
          }
          try {
            originalError(...args)
          } catch (e) {
            // swallow to avoid breaking UI when console is unavailable
          }
        }

        // Load Tabulator CSS
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/tabulator-tables@6.2.1/dist/css/tabulator.min.css"
        document.head.appendChild(link)

        // Ensure luxon is available for Tabulator's datetime formatter
        try {
          const luxon = await import("luxon")
          // Tabulator expects a global DateTime (and sometimes window.luxon)
          ;(window as any).DateTime = luxon.DateTime
          ;(window as any).luxon = luxon
        } catch (e) {
          // If luxon can't be loaded, Tabulator will warn when trying to use datetime formatter
          console.warn("luxon import failed (datetime formatter will be disabled):", e)
        }

        // Load Tabulator JS
        const { TabulatorFull } = await import("tabulator-tables")
        window.Tabulator = TabulatorFull
      }
    }
    loadTabulator()
  }, [])

  // Load table data and columns
  useEffect(() => {
    loadTableData()
  }, [itemId])

  // Initialize Tabulator when data is loaded
  useEffect(() => {
    if (columns.length > 0 && window.Tabulator && tableRef.current) {
      const cleanup = initializeTabulator()
      // If initializeTabulator returned a cleanup function, use it when effect unmounts or deps change
      return () => {
        if (typeof cleanup === "function") cleanup()
      }
    }
    // If no table was initialized, nothing to clean up
    return undefined
  }, [columns, tableData])

  const loadTableData = async () => {
    try {
      setLoading(true)

      // Load columns
      const columnsResponse = await fetch(`/api/tables/${itemId}/columns`)
      if (columnsResponse.ok) {
        const columnsData = await columnsResponse.json()
        setColumns(columnsData)
      }

      // Load table data
      const dataResponse = await fetch(`/api/tables/${itemId}/data`)
      if (dataResponse.ok) {
  const data = await dataResponse.json()
  // Normalize server shape { id, table_id, row_data } -> client shape { id, data }
  const normalized = (data || []).map((r: any) => ({ id: r.id, data: r.row_data || {} }))
  setTableData(normalized)
      }
    } catch (error) {
      console.error("Error loading table data:", error)
      toast({
        title: "Error",
        description: "Failed to load table data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const initializeTabulator = () => {
    if (!window.Tabulator || !tableRef.current) return

    try {
      // Destroy existing table
      if (tabulatorRef.current) {
        tabulatorRef.current.destroy()
      }

  const tabulatorColumns: any[] = columns.map((col) => {
        // Determine DB key and display title
        const dbKey = col.column_name || col.name || `column_${col.id}`
        const title = col.display_name || col.name || dbKey
        const fieldName = String(dbKey).toLowerCase().replace(/\s+/g, "_")

        return {
          title: title,
          field: fieldName,
          editor: getEditorForType(col.data_type),
          formatter: getFormatterForType(col.data_type),
          headerSort: true,
          headerContextMenu: [
            {
              label: "Edit Column",
              action: () => openColumnDialog(col),
            },
            {
              label: "Delete Column",
              action: () => handleDeleteColumn(col.id),
            },
          ],
          cellEdited: (cell: any) => {
            const rowData = cell.getRow().getData()
            updateRowData(rowData.id, rowData)
          },
        }
      })

      // Add action column
      tabulatorColumns.push({
        title: "Actions",
        field: "actions",
        width: 140,
      formatter: () =>
        '<div class="flex gap-2 items-center">' +
        '<button class="save-row-btn text-green-600 hover:text-green-800 px-2 py-1 rounded" aria-label="Save">' +
        '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">' +
        '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />' +
        '<path d="M17 21v-8H7v8" />' +
        '<path d="M7 3v5h8" />' +
        '</svg>' +
        '</button>' +
        '<button class="delete-row-btn text-red-500 hover:text-red-700 px-2 py-1 rounded" aria-label="Delete">' +
        '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">' +
        '<path d="M3 6h18" />' +
        '<path d="M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" />' +
        '<path d="M10 11v6" />' +
        '<path d="M14 11v6" />' +
        '<path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />' +
        '</svg>' +
        '</button>' +
        '</div>',
        cellClick: (e: any, cell: any) => {
          // support clicking the svg inside the button by using closest
          const saveBtn = (e.target as HTMLElement).closest?.(".save-row-btn")
          if (saveBtn) {
            const rowData = cell.getRow().getData()
            // call updateRowData to persist the current row
            updateRowData(rowData.id, rowData)
            return
          }

          const delBtn = (e.target as HTMLElement).closest?.(".delete-row-btn")
          if (delBtn) {
            const confirmed = window.confirm("Are you sure you want to delete this row?")
            if (confirmed) {
              deleteRow(cell.getRow().getData().id)
            }
          }
        },
      })

      const mappedData = tableData.map((row) => {
        const mappedRow: any = { id: row.id }
        columns.forEach((col) => {
          const dbKey = col.column_name || col.name || `column_${col.id}`
          const fieldName = String(dbKey).toLowerCase().replace(/\s+/g, "_")
          mappedRow[fieldName] = row.data?.[dbKey] ?? getDefaultValueForType(col.data_type, col.default_value)
        })
        return mappedRow
      })

      tabulatorRef.current = new window.Tabulator(tableRef.current, {
        data: mappedData,
        columns: tabulatorColumns,
        layout: "fitColumns",
        pagination: "local",
        paginationSize: 50,
        movableColumns: true,
        resizableRows: true,
        addRowPos: "top",
        history: true,
        keybindings: {
          navEnter: "editNextCell", // Enter key moves to next cell and saves
        },
        editTriggerEvent: "click",
        autoResize: false, // Disable auto-resize to prevent observer loops
        resizableColumns: true,
        responsiveLayout: "hide", // Better responsive handling
      })

      // Use a browser-friendly timeout type
      let resizeTimeout: number | undefined
      const handleResize = () => {
        if (resizeTimeout) clearTimeout(resizeTimeout)
        resizeTimeout = window.setTimeout(() => {
          if (tabulatorRef.current) {
            try {
              tabulatorRef.current.redraw()
            } catch (error) {
              // Suppress resize-related errors
              console.debug("Tabulator resize error (suppressed):", error)
            }
          }
        }, 100)
      }

      window.addEventListener("resize", handleResize)

      // Cleanup function
      return () => {
        window.removeEventListener("resize", handleResize)
        if (resizeTimeout) clearTimeout(resizeTimeout)
      }
    } catch (error) {
      console.error("Error initializing Tabulator:", error)
      toast({
        title: "Error",
        description: "Failed to initialize table view",
        variant: "destructive",
      })
    }
  }

  const getEditorForType = (dataType: string) => {
    switch (dataType) {
      case "number":
      case "decimal":
      case "double":
        return "number"
      case "date":
        return "date"
      case "boolean":
      case "checkbox":
        return "tickCross"
      default:
        return "input"
    }
  }

  const getFormatterForType = (dataType: string) => {
    switch (dataType) {
      case "boolean":
      case "checkbox":
        return "tickCross"
      case "date":
        // Return a safe formatter that uses luxon if available on window, otherwise falls back
        return (cell: any) => {
          try {
            const v = cell.getValue()
            if (!v) return ""
            // If luxon DateTime is available, use it to format; otherwise return raw value
            if ((window as any).DateTime && typeof (window as any).DateTime.fromISO === "function") {
              try {
                return (window as any).DateTime.fromISO(v).toLocaleString()
              } catch (e) {
                return String(v)
              }
            }
            return String(v)
          } catch (e) {
            return ""
          }
        }
      case "decimal":
      case "double":
        return (cell: any) => Number.parseFloat(cell.getValue()).toFixed(2)
      default:
        return undefined
    }
  }

  const updateRowData = async (rowId: number, data: any) => {
    try {
      const originalData: any = {}
      columns.forEach((col) => {
        const dbKey = col.column_name || col.name || `column_${col.id}`
        const fieldName = String(dbKey).toLowerCase().replace(/\s+/g, "_")
        if (data[fieldName] !== undefined) {
          originalData[dbKey] = data[fieldName]
        }
      })

      // Merge with existing server row data to avoid overwriting other fields
      const existingRow = tableData.find((r) => r.id === rowId)
      const mergedData = { ...(existingRow?.data || {}), ...originalData }

      const response = await fetch(`/api/tables/${itemId}/data/${rowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: mergedData }),
      })

      if (!response.ok) {
        let errBody: any
        try {
          errBody = await response.json()
        } catch (e) {
          errBody = await response.text()
        }
        console.error("Update row failed:", errBody)
        throw new Error(typeof errBody === "string" ? errBody : errBody?.error || "Failed to update row")
      }

      const respData = await response.json()

      toast({
        title: "Success",
        description: "Row updated successfully",
      })
    } catch (error) {
      console.error("Error updating row:", error)
      const message = (error as any)?.message || "Failed to update row"
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      })
      // Revert the change in Tabulator by reloading data
      loadTableData()
    }
  }

  const deleteRow = async (rowId: number) => {
    try {
      const response = await fetch(`/api/tables/${itemId}/data/${rowId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete row")
      }

      // Remove from Tabulator
      const row = tabulatorRef.current.getRow(rowId)
      row.delete()

      toast({
        title: "Success",
        description: "Row deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting row:", error)
      toast({
        title: "Error",
        description: "Failed to delete row",
        variant: "destructive",
      })
    }
  }

  const addNewRow = () => {
    if (!tabulatorRef.current) return

    const defaultData: any = { id: Date.now() }
    columns.forEach((col) => {
      const dbKey = col.column_name || col.name || `column_${col.id}`
      const fieldName = String(dbKey).toLowerCase().replace(/\s+/g, "_")
      defaultData[fieldName] = getDefaultValueForType(col.data_type, col.default_value)
    })

  tabulatorRef.current.addRow(defaultData, true)

    // Map field names back to DB column keys for database
    const originalData: any = {}
    columns.forEach((col) => {
      const dbKey = col.column_name || col.name || `column_${col.id}`
      const fieldName = String(dbKey).toLowerCase().replace(/\s+/g, "_")
      originalData[dbKey] = defaultData[fieldName]
    })

    // Save to database; pass the client temp id so we can update the right row after server returns
    createNewRow(originalData, defaultData.id)
  }

  // saveAllRows removed — cell edits now auto-save via cellEdited handler

  const createNewRow = async (data: any, clientTempId?: number) => {
    try {
      const response = await fetch(`/api/tables/${itemId}/data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      })

      if (!response.ok) {
        let errBody: any
        try {
          errBody = await response.json()
        } catch (e) {
          errBody = await response.text()
        }
        console.error("Create row failed:", errBody)
        throw new Error(typeof errBody === "string" ? errBody : errBody?.error || "Failed to create row")
      }

      const newRow = await response.json()

      // Update the row in Tabulator. Prefer using clientTempId if provided.
      let row: any = null
      if (clientTempId) {
        row = tabulatorRef.current.getRow(clientTempId)
      }
      // Fallback: try to find a row with matching mapped field names
      if (!row) {
        const rows = tabulatorRef.current.getRows()
        row = rows.find((r: any) => {
          const rdata = r.getData()
          // map original data keys (DB keys) to field names used in Tabulator
          return Object.keys(data).every((dbKey) => {
            const fieldKey = String(dbKey).toLowerCase().replace(/\s+/g, "_")
            return rdata[fieldKey] === data[dbKey]
          })
        })
      }
      if (row) {
        row.update({ ...data, id: newRow.id })
      } else {
        // If we couldn't find the client row, just add the returned row to Tabulator
        tabulatorRef.current.addRow({ ...mapServerRowToTabulator(newRow) }, true)
      }

      toast({
        title: "Success",
        description: "Row created successfully",
      })
    } catch (error: any) {
      console.error("Error creating row:", error)
      toast({
        title: "Error",
        description: error?.message || "Failed to create row",
        variant: "destructive",
      })
    }
  }

  const mapServerRowToTabulator = (serverRow: any) => {
    // serverRow is expected to have { id, table_id, row_data }
    const mapped: any = { id: serverRow.id }
    columns.forEach((col) => {
  const dbKey = col.column_name || col.name || `column_${col.id}`
  const fieldName = String(dbKey).toLowerCase().replace(/\s+/g, "_")
  mapped[fieldName] = serverRow.row_data?.[dbKey] ?? getDefaultValueForType(col.data_type, col.default_value)
    })
    return mapped
  }

  const getDefaultValueForType = (dataType: string, defaultValue?: string) => {
    if (defaultValue) return defaultValue

    switch (dataType) {
      case "number":
      case "decimal":
      case "double":
        return 0
      case "boolean":
      case "checkbox":
        return false
      case "date":
        return new Date().toISOString().split("T")[0]
      default:
        return ""
    }
  }

  const handleCreateColumn = async () => {
    try {
      const response = await fetch(`/api/tables/${itemId}/columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newColumn,
          sort_order: columns.length,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create column")
      }

      setNewColumn({ name: "", data_type: "text", is_required: false, default_value: "" })
      setShowColumnDialog(false)
      loadTableData() // Reload to refresh Tabulator

      toast({
        title: "Success",
        description: "Column created successfully",
      })
    } catch (error) {
      console.error("Error creating column:", error)
      toast({
        title: "Error",
        description: "Failed to create column",
        variant: "destructive",
      })
    }
  }

  const handleEditColumn = async () => {
    if (!editingColumn) return

    try {
      const response = await fetch(`/api/tables/${itemId}/columns/${editingColumn.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newColumn),
      })

      if (!response.ok) {
        throw new Error("Failed to update column")
      }

      setEditingColumn(null)
      setNewColumn({ name: "", data_type: "text", is_required: false, default_value: "" })
      setShowColumnDialog(false)
      loadTableData() // Reload to refresh Tabulator

      toast({
        title: "Success",
        description: "Column updated successfully",
      })
    } catch (error) {
      console.error("Error updating column:", error)
      toast({
        title: "Error",
        description: "Failed to update column",
        variant: "destructive",
      })
    }
  }

  const handleDeleteColumn = async (columnId: number) => {
    try {
      const response = await fetch(`/api/tables/${itemId}/columns/${columnId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete column")
      }

      loadTableData() // Reload to refresh Tabulator

      toast({
        title: "Success",
        description: "Column deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting column:", error)
      toast({
        title: "Error",
        description: "Failed to delete column",
        variant: "destructive",
      })
    }
  }

  const openColumnDialog = (column?: Column) => {
    if (column) {
      setEditingColumn(column)
      setNewColumn({
        name: column.name || "",
        data_type: column.data_type || "text",
        is_required: column.is_required || false,
        default_value: column.default_value || "",
      })
    } else {
      setEditingColumn(null)
      setNewColumn({ name: "", data_type: "text", is_required: false, default_value: "" })
    }
    setShowColumnDialog(true)
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b p-4">
          <h1 className="text-2xl font-semibold">{itemName}</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading table...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <ContextMenu>
            <ContextMenuTrigger>
              <h1 className="text-2xl font-semibold cursor-pointer hover:text-primary">{itemName}</h1>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => openColumnDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Column
              </ContextMenuItem>
              <ContextMenuItem onClick={() => setShowColumnDialog(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Manage Columns
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>

          <div className="flex gap-2">
            <Button onClick={addNewRow} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Row
            </Button>
            <Button onClick={() => openColumnDialog()} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Column
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground mt-1">
          Right-click table name or column headers for management • Press Enter to save cell changes
        </p>
      </div>

      <div className="flex-1 p-4">
        {columns.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="mb-4">No columns defined for this table</p>
            <Button onClick={() => openColumnDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Column
            </Button>
          </div>
        ) : (
          <div ref={tableRef} className="w-full h-full"></div>
        )}
      </div>

      <Dialog open={showColumnDialog} onOpenChange={setShowColumnDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingColumn ? "Edit Column" : "Add New Column"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="columnName">Column Name</Label>
              <Input
                id="columnName"
                value={newColumn.name || ""}
                onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                placeholder="Enter column name"
              />
            </div>

            <div>
              <Label htmlFor="dataType">Data Type</Label>
              <Select
                value={newColumn.data_type}
                onValueChange={(value) => setNewColumn({ ...newColumn, data_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="decimal">Decimal</SelectItem>
                  <SelectItem value="double">Double</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="defaultValue">Default Value (Optional)</Label>
              <Input
                id="defaultValue"
                value={newColumn.default_value || ""}
                onChange={(e) => setNewColumn({ ...newColumn, default_value: e.target.value })}
                placeholder="Enter default value"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isRequired"
                checked={newColumn.is_required}
                onChange={(e) => setNewColumn({ ...newColumn, is_required: e.target.checked })}
              />
              <Label htmlFor="isRequired">Required Field</Label>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <div>
              {editingColumn && (
                <Button variant="destructive" onClick={() => handleDeleteColumn(editingColumn.id)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Column
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowColumnDialog(false)}>
                Cancel
              </Button>
              <Button onClick={editingColumn ? handleEditColumn : handleCreateColumn}>
                {editingColumn ? "Update" : "Create"} Column
              </Button>
            </div>
          </div>

          {!editingColumn && columns.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-3">Existing Columns</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {columns.map((column) => (
                  <div key={column.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <span className="font-medium">{column.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">({column.data_type})</span>
                      {column.is_required && <span className="text-xs text-red-500 ml-2">Required</span>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => openColumnDialog(column)}>
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
