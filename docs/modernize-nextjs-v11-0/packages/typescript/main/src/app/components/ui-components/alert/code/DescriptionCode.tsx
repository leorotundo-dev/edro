import CodePreview from "@/app/components/shared/CodePreview";
import DescriptionAlert from "../DescriptionAlert";

const DescriptionCode = () => {
    return (
        <CodePreview
            component={<DescriptionAlert />}
            filePath="src/app/components/ui-components/alert/DescriptionAlert.tsx"
            title="Description"
        />
    );
};

export default DescriptionCode;