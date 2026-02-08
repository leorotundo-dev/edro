"use client";
import React from 'react';
import { Typography } from '@mui/material';

const Overline = () => {
    return (
        <>
            <Typography variant="overline">
                overline. Lorem ipsum dolor sit amet, consectetur adipisicing
                elit. Quos blanditiis tenetur
            </Typography>
            <Typography variant="body1" color="textSecondary">
                font size: 12 | line-height: 31 | font weight: 400
            </Typography>
        </>
    );
};

export default Overline;
