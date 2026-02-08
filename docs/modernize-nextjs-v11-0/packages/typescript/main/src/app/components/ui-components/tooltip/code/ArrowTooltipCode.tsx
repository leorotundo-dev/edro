import CodeDialog from '@/app/components/shared/CodeDialog'
import CodePreview from '@/app/components/shared/CodePreview'
import React from 'react'
import TooltipArrow from '../TooltipArrow'
const ArrowTooltipCode = () => {
  return (
    <>
      <CodePreview
        component={<TooltipArrow />}
        filePath="src/app/components/ui-components/tooltip/TooltipArrow.tsx"
        title="TooltipArrow"
      ></CodePreview>

    </>
  )
}

export default ArrowTooltipCode
