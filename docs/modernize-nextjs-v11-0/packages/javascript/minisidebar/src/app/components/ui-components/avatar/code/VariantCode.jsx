import CodePreview from "@/app/components/shared/CodePreview";
import VariantAvatar from "../VariantAvatar";

const VariantCode = () => {
    return (
        <CodePreview
            component={<VariantAvatar />}
            filePath="src/app/components/ui-components/avatar/VariantAvatar.jsx"
            title="Variant Avatars"
        />
    );
};

export default VariantCode;