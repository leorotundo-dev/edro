import CodePreview from '@/app/components/shared/CodePreview'
import React from 'react'
import TabIconLabel from '../TabIconLabel'
const IconWithLabelCode = () => {
  return (
    <>
      <CodePreview
        component={<TabIconLabel />}
        filePath="src/app/components/ui-components/tab/TabIconLabel.tsx"
        title="IconWithLabel"
      />
    </>
  )
}

export default IconWithLabelCode
