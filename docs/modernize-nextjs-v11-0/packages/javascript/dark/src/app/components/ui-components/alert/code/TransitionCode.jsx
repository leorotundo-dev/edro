import CodePreview from "@/app/components/shared/CodePreview";
import TransitionAlert from "../TransitionAlert";

const TransitionCode = () => {
    return (
        <CodePreview
            component={<TransitionAlert />}
            filePath="src/app/components/ui-components/alert/TransitionAlert.jsx"
            title="Transition"
        />
    );
};

export default TransitionCode;
