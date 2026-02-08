import CodePreview from "@/app/components/shared/CodePreview";
import OutlinedAlert from "../OutlinedAlert";

const OutlinedCode = () => {
    return (
        <CodePreview
            component={<OutlinedAlert />}
            filePath="src/app/components/ui-components/alert/OutlinedAlert.tsx"
            title="Outlined"
        />
    );
};

export default OutlinedCode;