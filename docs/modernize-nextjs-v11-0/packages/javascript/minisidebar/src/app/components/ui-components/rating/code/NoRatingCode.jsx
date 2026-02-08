import CodePreview from "@/app/components/shared/CodePreview";
import React from "react";
import NoRating from "../NoRating";

function NoRatingCode() {
  return (
    <CodePreview
      component={<NoRating />}
      filePath="src/app/components/ui-components/rating/NoRating.jsx"
      title="NoRating"
    ></CodePreview>
  );
}

export default NoRatingCode;
