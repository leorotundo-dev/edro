import CodePreview from "@/app/components/shared/CodePreview";
import CustomOutlinedIconChip from "../CustomOutlinedIconChip";

const CustomOutlinedIcon = () => {
  return (
    <CodePreview
      component={<CustomOutlinedIconChip />}
      filePath="src/app/components/ui-components/chip/CustomOutlinedIconChip.tsx"
      title="Custom Outlined Icon Chips"
    />
  );
};

export default CustomOutlinedIcon;
