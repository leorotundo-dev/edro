import CodePreview from "@/app/components/shared/CodePreview";
import FilledAlert from "../FilledAlert";

const FilledCode = () => {
    return (
        <CodePreview
            component={<FilledAlert />}
            filePath="src/app/components/ui-components/alert/FilledAlert.tsx"
            title="Filled"
        />
    );
};

export default FilledCode;