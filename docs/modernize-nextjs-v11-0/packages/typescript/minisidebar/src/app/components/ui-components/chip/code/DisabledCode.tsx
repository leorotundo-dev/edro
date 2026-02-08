import CodePreview from "@/app/components/shared/CodePreview";
import DisabledChip from "../DisabledChip";

const DisabledCode = () => {
  return (
    <CodePreview
      component={<DisabledChip />}
      filePath="src/app/components/ui-components/chip/DisabledChip.tsx"
      title="Disabled Chips"
    />
  );
};

export default DisabledCode;
