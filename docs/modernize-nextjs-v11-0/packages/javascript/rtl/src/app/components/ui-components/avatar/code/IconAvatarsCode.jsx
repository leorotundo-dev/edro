import CodePreview from "@/app/components/shared/CodePreview";
import IconAvatar from "../IconAvatar";

const IconAvatarsCode = () => {
    return (
        <CodePreview
            component={<IconAvatar />}
            filePath="src/app/components/ui-components/avatar/IconAvatar.jsx"
            title="Icon Avatars"
        />
    );
};

export default IconAvatarsCode;