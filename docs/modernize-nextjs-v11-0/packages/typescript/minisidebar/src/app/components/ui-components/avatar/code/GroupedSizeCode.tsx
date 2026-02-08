import CodePreview from "@/app/components/shared/CodePreview";
import GroupedSizeAvatar from "../GroupedSizeAvatar";

const GroupedSizeCode = () => {
    return (
        <CodePreview
            component={<GroupedSizeAvatar />}
            filePath="src/app/components/ui-components/avatar/GroupedSizeAvatar.tsx"
            title="Grouped Size Avatars"
        />
    );
};

export default GroupedSizeCode;