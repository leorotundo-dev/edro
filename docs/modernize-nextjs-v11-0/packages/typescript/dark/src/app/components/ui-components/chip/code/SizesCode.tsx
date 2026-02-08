import CodePreview from "@/app/components/shared/CodePreview";
import SizesChip from "../SizesChip";

const SizesCode = () => {
  return (
    <CodePreview
      component={<SizesChip />}
      filePath="src/app/components/ui-components/chip/SizesChip.tsx"
      title="Chip Sizes"
    />
  );
};

export default SizesCode;
