import TabScrollable from "../TabScrollable";
import CodePreview from "@/app/components/shared/CodePreview";
const IconBottomCode = () => {
    return (
        <>
            <CodePreview
                component={<TabScrollable />}
                filePath="src/app/components/ui-components/tab/TabScrollable.jsx"
                title="Scrollable"
            />
        </>
    );
};

export default IconBottomCode;