import CodePreview from "@/app/components/shared/CodePreview";
import ReadOnly from "../ReadOnly";

function ReadonlyCode() {
  return (
    <CodePreview
      component={<ReadOnly />}
      filePath="src/app/components/ui-components/rating/ReadOnly.tsx"
      title="ReadOnly"
    ></CodePreview>
  );
}

export default ReadonlyCode;
