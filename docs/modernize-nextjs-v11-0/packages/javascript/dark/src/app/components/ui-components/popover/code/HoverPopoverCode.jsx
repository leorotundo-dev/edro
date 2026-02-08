import CodeDialog from "@/app/components/shared/CodeDialog";
import CodePreview from "@/app/components/shared/CodePreview";
import React from "react";
import HoverPopover from "../HoverPopover";
const HoverPopoverCode = () => {
  return (
    <>
      <CodePreview
        component={<HoverPopover />}
        filePath="src/app/components/ui-components/popover/HoverPopover .jsx"
        title="HoverPopover"
      ></CodePreview>
    </>
  );
};

export default HoverPopoverCode;
