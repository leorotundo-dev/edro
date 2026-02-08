import React from "react";
import RadioGroup from "../RadioGroup";
import CodePreview from "@/app/components/shared/CodePreview";

function RadioGroupCode() {
  return (
    <CodePreview
      component={<RadioGroup />}
      filePath="src/app/components/ui-components/rating/RadioGroup.tsx"
      title="RadioGroup"
    ></CodePreview>
  );
}

export default RadioGroupCode;
