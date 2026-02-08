import CodePreview from "@/app/components/shared/CodePreview";
import React from "react";
import AlertDialog from "../AlertDialog";

function AlertDialogCode() {
  return (
    <CodePreview
      component={<AlertDialog />}
      filePath="src/app/components/ui-components/dialog/AlertDialog.tsx"
      title="Alert Dialog"
    />
  );
}

export default AlertDialogCode;
