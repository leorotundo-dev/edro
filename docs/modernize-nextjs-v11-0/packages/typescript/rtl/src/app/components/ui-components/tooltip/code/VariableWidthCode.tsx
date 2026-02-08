import CodePreview from "@/app/components/shared/CodePreview";
import React from "react";
import VariableWidthTooltip from "../TooltipVariableWidth";
const VariableWidthCode = () => {
  return (
    <>
      <CodePreview
        component={<VariableWidthTooltip />}
        filePath="src/app/components/ui-components/tooltip/TooltipVariableWidth.tsx"
        title="VariableWidthTooltip"
      ></CodePreview>
    </>
  );
};

export default VariableWidthCode;
