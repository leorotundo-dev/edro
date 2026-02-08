import Controlled from "../Controlled";
import CodePreview from "@/app/components/shared/CodePreview";
const ControlledCode = () => {
  return (
    <>
      <CodePreview
        component={<Controlled />}
        filePath="src/app/components/ui-components/accordion/Controlled.tsx"
        title="Controlled"
      />
    </>
  );
};

export default ControlledCode;
