import CodePreview from "@/app/components/shared/CodePreview";
import SizesAvatar from "../SizesAvatar";

const SizesCode = () => {
    return (
        <CodePreview
            component={<SizesAvatar />}
            filePath="src/app/components/ui-components/avatar/SizesAvatar.jsx"
            title="Avatar Sizes"
        />
    );
};

export default SizesCode;