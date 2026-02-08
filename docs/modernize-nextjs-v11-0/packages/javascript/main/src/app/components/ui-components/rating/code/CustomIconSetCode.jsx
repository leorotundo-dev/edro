import React from "react";
import CodePreview from "@/app/components/shared/CodePreview";
import CustomIconSet from "../CustomIconSet";

function CustomIconSetCode() {
  return (
    <CodePreview
      component={<CustomIconSet />}
      filePath="src/app/components/ui-components/rating/CustomIconSet.jsx"
      title="CustomIconSet"
    ></CodePreview>
  );
}

export default CustomIconSetCode;
