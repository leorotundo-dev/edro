import CodePreview from '@/app/components/shared/CodePreview'
import React from 'react'
import TabIconLeft from '../TabIconLeft'
const IconLeftCode = () => {
  return (
    <>
      <CodePreview
        component={<TabIconLeft />}
        filePath="src/app/components/ui-components/tab/TabIconLeft.tsx"
        title="IconLeft"
      />
    </>
  )
}

export default IconLeftCode
