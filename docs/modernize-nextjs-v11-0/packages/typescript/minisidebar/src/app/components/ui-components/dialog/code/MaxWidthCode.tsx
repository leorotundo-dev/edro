import CodePreview from "@/app/components/shared/CodePreview";
import MaxWidthDialog from "../MaxWidthDialog";

const MaxWidthCode = () => {
  return (
    <CodePreview
      component={<MaxWidthDialog />}
      filePath="src/app/components/ui-components/dialog/MaxWidthDialog.tsx"
      title="Max Width Dialog"
    />
  );
};

export default MaxWidthCode;
