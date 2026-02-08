import React from 'react'

import Breadcrumb from '../../layout/shared/breadcrumb/Breadcrumb'
import Integartionpage from '@/app/components/pages/integration/Integartionpage'





const BCrumb = [
    {
        to: '/',
        title: 'Home',
    },
    {

        title: 'Integration',
    },
]


function Integration() {
    return (
        <>
            <Breadcrumb title='Integration' items={BCrumb} />
            <Integartionpage />
        </>
    )
}

export default Integration