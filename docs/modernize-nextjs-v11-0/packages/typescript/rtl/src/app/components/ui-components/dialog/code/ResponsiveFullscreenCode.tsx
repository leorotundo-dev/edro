import CodePreview from "@/app/components/shared/CodePreview";
import ResponsiveDialog from "../ResponsiveDialog";

const ResponsiveFullscreenCode = () => {
  return (
    <CodePreview
      component={<ResponsiveDialog />}
      filePath="src/app/components/ui-components/dialog/ResponsiveDialog.tsx"
      title="Responsive Fullscreen Dialog"
    />
  );
};

export default ResponsiveFullscreenCode;
