import CodePreview from "@/app/components/shared/CodePreview";
import VariantAvatar from "../VariantAvatar";

const VariantCode = () => {
    return (
        <CodePreview
            component={<VariantAvatar />}
            filePath="src/app/components/ui-components/avatar/VariantAvatar.tsx"
            title="Variant Avatars"
        />
    );
};

export default VariantCode;