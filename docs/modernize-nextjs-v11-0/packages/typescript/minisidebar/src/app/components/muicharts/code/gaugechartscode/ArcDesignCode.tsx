import React from "react";
import CodeDialog from "@/app/components/shared/CodeDialog";

function ArcDesignCode() {
    return (
        <CodeDialog>
            {`
import * as React from 'react';
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge';
   
const BCrumb = [
{
to: '/',
title: 'Home',
},
{
title: 'ArcDesignChart ',
},
]; 
const settings = {
    width: 200,
    height: 200,
    value: 60,
};

export default function ArcDesignChart() {
    return (
       

            <Gauge
                {...settings}
                cornerRadius="50%"
                sx={(theme) => ({
                    [\`& \.\${gaugeClasses.valueText}\`]: {
                fontSize: 40,
                    },
            [\`& \.\${gaugeClasses.valueArc}\`]: {
                fill: '#5D87FF',
                    },
            [\`& \.\${gaugeClasses.referenceArc}\`]: {
                fill: theme.palette.text.disabled,
                    },
                })}
            />
  
    );
}


`}
        </CodeDialog>
    );
}

export default ArcDesignCode;
