import React from "react";
import CodePreview from "@/app/components/shared/CodePreview";
import FullscreenDialog from "../FullscreenDialog";

function FullscreenDialogCode() {
  return (
    <CodePreview
      component={<FullscreenDialog />}
      filePath="src/app/components/ui-components/dialog/FullscreenDialog.tsx"
      title="Fullscreen Dialog"
    />
  );
}

export default FullscreenDialogCode;
