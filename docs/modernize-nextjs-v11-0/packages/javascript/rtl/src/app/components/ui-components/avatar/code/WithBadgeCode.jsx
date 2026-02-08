import CodePreview from "@/app/components/shared/CodePreview";
import WithBadgeAvatar from "../WithBadgeAvatar";

const WithBadgeCode = () => {
    return (
        <CodePreview
            component={<WithBadgeAvatar />}
            filePath="src/app/components/ui-components/avatar/WithBadgeAvatar.jsx"
            title="Avatars with Badge"
        />
    );
};

export default WithBadgeCode;