import CodePreview from "@/app/components/shared/CodePreview";

import HoverFeedback from "../HoverFeedback";

function HoverFeedbackCode() {
  return (
    <CodePreview
      component={<HoverFeedback />}
      filePath="src/app/components/ui-components/rating/HoverFeedback.tsx"
      title="HoverFeedback"
    ></CodePreview>
  );
}

export default HoverFeedbackCode;
