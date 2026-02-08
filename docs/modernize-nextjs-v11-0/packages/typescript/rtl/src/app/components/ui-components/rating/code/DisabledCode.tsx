import React from "react";
import Disabled from "../Disabled";
import CodePreview from "@/app/components/shared/CodePreview";

function DisabledCode() {
  return (
    <CodePreview
      component={<Disabled />}
      filePath="src/app/components/ui-components/rating/Disabled.tsx"
      title="Disabled"
    ></CodePreview>
  );
}

export default DisabledCode;
