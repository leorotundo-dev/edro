import React from "react";
import CodePreview from "@/app/components/shared/CodePreview";
import RatingPrecision from "../RatingPrecision";

function RatingPrecisionCode() {
  return (
    <CodePreview
      component={<RatingPrecision />}
      filePath="src/app/components/ui-components/rating/RatingPrecision.jsx"
      title="RatingPrecision"
    ></CodePreview>
  );
}

export default RatingPrecisionCode;
