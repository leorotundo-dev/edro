
import React from 'react'
import FolderList from '../FolderList'
import CodePreview from '@/app/components/shared/CodePreview'
const FolderListCode = () => {
  return (
    <>
      <CodePreview
        component={<FolderList />}
        filePath="src/app/components/ui-components/lists/FolderList.tsx"
        title="Folder List"
      >

      </CodePreview>
    </>
  )
}

export default FolderListCode
