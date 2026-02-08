import CodePreview from '@/app/components/shared/CodePreview'
import React from 'react'
import TransitionsTooltip from '../TooltipTransition'
const TransitionsCode = () => {
  return (
    <>
      <CodePreview
        component={<TransitionsTooltip />}
        filePath="src/app/components/ui-components/tooltip/TooltipTransition.tsx"
        title="TransitionsTooltip"
      ></CodePreview>
    </>
  )
}

export default TransitionsCode
