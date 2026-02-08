import CodePreview from "@/app/components/shared/CodePreview";
import ActionAlert from "../ActionAlert";

const ActionCode = () => {
    return (
        <CodePreview
            component={<ActionAlert />}
            filePath="src/app/components/ui-components/alert/ActionAlert.jsx"
            title="Action"
        />
    );
};

export default ActionCode;