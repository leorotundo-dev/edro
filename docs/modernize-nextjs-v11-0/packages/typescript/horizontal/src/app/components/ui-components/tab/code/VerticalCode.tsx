import CodePreview from "@/app/components/shared/CodePreview";
import React from "react";
import TabVertical from "../TabVertical";
const IconBottomCode = () => {
    return (
        <>
            <CodePreview
                component={<TabVertical />}
                filePath="src/app/components/ui-components/tab/TabVertical.tsx"
                title="Vertical"
            />
        </>
    );
};

export default IconBottomCode;