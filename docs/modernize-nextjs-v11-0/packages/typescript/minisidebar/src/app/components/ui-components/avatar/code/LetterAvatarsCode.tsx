import CodePreview from "@/app/components/shared/CodePreview";
import LetterAvatar from "../LetterAvatar";

const LetterAvatarsCode = () => {
    return (
        <CodePreview
            component={<LetterAvatar />}
            filePath="src/app/components/ui-components/avatar/LetterAvatar.tsx"
            title="Letter Avatars"
        />
    );
};

export default LetterAvatarsCode;