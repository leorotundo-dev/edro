import CodeDialog from '@/app/components/shared/CodeDialog'
import CodePreview from '@/app/components/shared/CodePreview'
import React from 'react'
import ControlsList from '../ControlsList'
const ControlsListCode = () => {
  return (
    <>
      <CodePreview
        component={<ControlsList />}
        filePath="src/app/components/ui-components/lists/ControlsList.tsx"
        title="Controls List"

      >

      </CodePreview>
    </>
  )
}

export default ControlsListCode
