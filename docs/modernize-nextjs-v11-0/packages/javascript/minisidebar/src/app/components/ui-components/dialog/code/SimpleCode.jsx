import CodePreview from "@/app/components/shared/CodePreview";
import SimpleDialog from "../SimpleDialog";

const SimpleCode = () => {
  return (
    <CodePreview
      component={<SimpleDialog />}
      filePath="src/app/components/ui-components/dialog/SimpleDialog.jsx"
      title="Simple Dialog"
    />
  );
};

export default SimpleCode;
