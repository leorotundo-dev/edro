import CodePreview from "@/app/components/shared/CodePreview";
import OutlinedChip from "../OutlinedChip";

const OutlinedCode = () => {
  return (
    <CodePreview
      component={<OutlinedChip />}
      filePath="src/app/components/ui-components/chip/OutlinedChip.jsx"
      title="Outlined Chips"
    />
  );
};

export default OutlinedCode;
