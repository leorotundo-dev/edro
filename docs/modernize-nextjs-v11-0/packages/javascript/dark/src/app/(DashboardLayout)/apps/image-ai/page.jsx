import React from 'react'

import Breadcrumb from "../../layout/shared/breadcrumb/Breadcrumb";

import ImageAiApp from '@/app/components/apps/image-ai'
import { ImageAiProvider } from '@/app/context/ImageAiContext'
import AppCard from '@/app/components/shared/AppCard';



const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Image-AI',
  },
]

function ImageAI() {
  return (
    <>
      <ImageAiProvider>
        <Breadcrumb title='Image-AI' items={BCrumb} />
        <AppCard>
          <ImageAiApp />
        </AppCard>
      </ImageAiProvider>
    </>
  )
}

export default ImageAI
