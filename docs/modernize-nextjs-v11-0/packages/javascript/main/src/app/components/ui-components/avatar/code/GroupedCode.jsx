import CodePreview from "@/app/components/shared/CodePreview";
import GroupedAvatar from "../GroupedAvatar";

const GroupedCode = () => {
    return (
        <CodePreview
            component={<GroupedAvatar />}
            filePath="src/app/components/ui-components/avatar/GroupedAvatar.jsx"
            title="Grouped Avatars"
        />
    );
};

export default GroupedCode;