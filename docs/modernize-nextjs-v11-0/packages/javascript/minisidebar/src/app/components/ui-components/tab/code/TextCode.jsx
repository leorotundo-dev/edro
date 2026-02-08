import CodeDialog from "@/app/components/shared/CodeDialog";
import CodePreview from "@/app/components/shared/CodePreview";
import React from "react";
import TabText from "../TabText";
const TextCode = () => {
    return (
        <>
            <CodePreview
                component={<TabText />}
                filePath="src/app/components/ui-components/tab/TabText.jsx"
                title="TabText"
            />
        </>
    );
};

export default TextCode;
