import CodePreview from "@/app/components/shared/CodePreview";
import CustomIconChip from "../CustomIconChip";

const CustomIconCode = () => {
  return (
    <CodePreview
      component={<CustomIconChip />}
      filePath="src/app/components/ui-components/chip/CustomIconChip.jsx"
      title="Custom Icon Chips"
    />
  );
};

export default CustomIconCode;
