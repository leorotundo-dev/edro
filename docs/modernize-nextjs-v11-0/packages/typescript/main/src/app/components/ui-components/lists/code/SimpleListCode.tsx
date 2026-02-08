import CodeDialog from '@/app/components/shared/CodeDialog'
import React from 'react'
import SimpleList from '../SimpleList'
import CodePreview from '@/app/components/shared/CodePreview'
const SimpleListCode = () => {
  return (
    <>
      <CodePreview
        component={<SimpleList />}
        filePath="src/app/components/ui-components/lists/SimpleList.tsx"
        title="Simple List"
      >
      </CodePreview>
    </>
  )
}

export default SimpleListCode
