
import React from 'react'
import EnhancedTransferList from '../EnhancedTransferList'
import CodePreview from '@/app/components/shared/CodePreview'
const EnhancedTransferListCode = () => {
  return (
    <>
      <CodePreview
        component={<EnhancedTransferList />}
        filePath="src/app/components/ui-components/transfer-list/EnhancedTransferList.tsx"
        title="EnhancedTransferList"
      >

      </CodePreview>
    </>
  )
}

export default EnhancedTransferListCode
