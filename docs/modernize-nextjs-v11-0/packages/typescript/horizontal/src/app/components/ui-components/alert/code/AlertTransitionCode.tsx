import CodePreview from "@/app/components/shared/CodePreview";
import AlertTransition from "../AlertTransition";

const AlertTransitionCode = () => {
    return (
        <CodePreview
            component={<AlertTransition />}
            filePath="src/app/components/ui-components/alert/AlertTransition.tsx"
            title="AlertTransition"
        />
    );
};

export default AlertTransitionCode;