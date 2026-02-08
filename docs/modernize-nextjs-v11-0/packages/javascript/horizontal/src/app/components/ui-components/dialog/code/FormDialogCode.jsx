import React from "react";
import CodePreview from "@/app/components/shared/CodePreview";
import FormDialog from "../FormDialog";

function FormDialogCode() {
  return (
    <CodePreview
      component={<FormDialog />}
      filePath="src/app/components/ui-components/dialog/FormDialog.jsx"
      title="Form Dialog"
    />
  );
}

export default FormDialogCode;
