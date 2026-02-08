import CodePreview from "@/app/components/shared/CodePreview";
import TransitionDialog from "../TransitionDialog";

const TransitionCode = () => {
  return (
    <CodePreview
      component={<TransitionDialog />}
      filePath="src/app/components/ui-components/dialog/TransitionDialog.jsx"
      title="Transition Dialog"
    />
  );
};

export default TransitionCode;
