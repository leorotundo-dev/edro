import CodeDialog from '@/app/components/shared/CodeDialog'
import React from 'react'
import CodePreview from '@/app/components/shared/CodePreview'

import NestedList from '../NestedList'
const NestedListCode = () => {
  return (
    <>
      <CodePreview
        component={<NestedList />}
        filePath="src/app/components/ui-components/lists/NestedList.jsx"
        title="NestedList "

      ></CodePreview>
    </>
  )
}

export default NestedListCode
