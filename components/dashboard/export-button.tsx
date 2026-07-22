import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ExportButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      nativeButton={false}
      render={<a href="/api/export" download />}
    >
      <Download />
      Exportar para Excel
    </Button>
  );
}
