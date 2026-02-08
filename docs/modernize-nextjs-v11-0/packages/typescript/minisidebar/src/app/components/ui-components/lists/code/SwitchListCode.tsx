import CodeDialog from '@/app/components/shared/CodeDialog'
import React from 'react'
import SwitchList from '../SwitchList'
import CodePreview from '@/app/components/shared/CodePreview'
const SwitchListCode = () => {
  return (
    <>

      <CodePreview
        component={<SwitchList />}
        filePath="src/app/components/ui-components/lists/SwitchList.tsx"
        title="SwitchList List"
      >

      </CodePreview>
    </>
  )
}

export default SwitchListCode
