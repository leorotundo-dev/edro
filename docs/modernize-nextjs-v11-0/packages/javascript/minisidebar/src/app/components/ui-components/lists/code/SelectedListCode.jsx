import CodePreview from "@/app/components/shared/CodePreview";

import SelectedList from "../SelectedList";
const SelectedListCode = () => {
  return (
    <>
      <CodePreview
        component={<SelectedList />}
        filePath="src/app/components/ui-components/lists/SelectedList.jsx"
        title="Selected List"
      ></CodePreview>
    </>
  );
};

export default SelectedListCode;
