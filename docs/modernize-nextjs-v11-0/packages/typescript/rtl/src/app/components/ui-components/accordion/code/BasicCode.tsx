import CodeDialog from "@/app/components/shared/CodeDialog";
import CodePreview from "@/app/components/shared/CodePreview";

import Basic from "../Basic";
const BasicCode = () => {
  return (
    <CodePreview
      component={<Basic />}
      filePath="src/app/components/ui-components/accordion/Basic.tsx"
      title="Basic"
    />
  );
};

export default BasicCode;
