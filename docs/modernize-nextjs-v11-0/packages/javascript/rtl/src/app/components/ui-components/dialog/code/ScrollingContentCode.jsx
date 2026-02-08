import CodePreview from "@/app/components/shared/CodePreview";
import ScrollContentDialog from "../ScrollContentDialog";

const ScrollingContentCode = () => {
  return (
    <CodePreview
      component={<ScrollContentDialog />}
      filePath="src/app/components/ui-components/dialog/ScrollContentDialog.jsx"
      title="Scrolling Content Dialog"
    />
  );
};

export default ScrollingContentCode;
