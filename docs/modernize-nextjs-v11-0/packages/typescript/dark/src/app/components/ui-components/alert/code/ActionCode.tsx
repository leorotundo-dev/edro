import CodePreview from "@/app/components/shared/CodePreview";
import ActionAlert from "../ActionAlert";

const ActionCode = () => {
    return (
        <CodePreview
            component={<ActionAlert />}
            filePath="src/app/components/ui-components/alert/ActionAlert.tsx"
            title="Action"
        />
    );
};

export default ActionCode;