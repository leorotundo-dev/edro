import CodePreview from "@/app/components/shared/CodePreview";
import FilledChip from "../FilledChip";

const FilledCode = () => {
  return (
    <CodePreview
      component={<FilledChip />}
      filePath="src/app/components/ui-components/chip/FilledChip.tsx"
      title="Filled Chips"
    />
  );
};

export default FilledCode;
