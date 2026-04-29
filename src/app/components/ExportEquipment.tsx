import React, { useState } from "react";
import { Download, Loader2, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { exportEquipmentToExcel } from "../utils/storage";

export default function ExportEquipment() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setSuccess(false);

    try {
      await exportEquipmentToExcel();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000); // Hide success message after 3 seconds
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to export equipment data";
      setError(errorMessage);
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleExport}
        disabled={isExporting}
        className="gap-2 bg-green-600 hover:bg-green-700 text-white"
      >
        {isExporting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            Export to Excel
          </>
        )}
      </Button>
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="text-green-600 text-sm bg-green-50 px-3 py-2 rounded">
          ✓ Excel file downloaded successfully!
        </div>
      )}
    </div>
  );
}
