import CodeDialog from '@/app/components/shared/CodeDialog'
import React from 'react'
import BasicTransferList from '../BasicTransferList'
import CodePreview from '@/app/components/shared/CodePreview'
const BasicTransferListCode = () => {
    return (
        <>
            <CodePreview
                component={<BasicTransferList />}
                filePath="src/app/components/ui-components/transfer-list/BasicTransferList.jsx"
                title="BasicTransferList"
            >

            </CodePreview>
        </>
    )
}

export default BasicTransferListCode
