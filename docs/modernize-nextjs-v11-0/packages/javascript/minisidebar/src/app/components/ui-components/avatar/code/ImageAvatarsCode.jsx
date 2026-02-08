import CodePreview from "@/app/components/shared/CodePreview";
import ImageAvatar from "../ImageAvatar";

const ImageAvatarsCode = () => {
    return (
        <CodePreview
            component={<ImageAvatar />}
            filePath="src/app/components/ui-components/avatar/ImageAvatar.jsx"
            title="Image Avatars"
        />
    );
};

export default ImageAvatarsCode;