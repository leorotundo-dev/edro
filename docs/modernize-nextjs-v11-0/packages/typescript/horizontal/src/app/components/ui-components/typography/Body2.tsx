"use client";
import React from 'react';
import { Typography } from '@mui/material';

const Body2 = () => {
    return (
        <>
            <Typography variant="body2">
                body2. Lorem ipsum dolor sit amet, consectetur adipisicing
                elit. Quos blanditiis tenetur
            </Typography>
            <Typography variant="body1" color="textSecondary">
                font size: 14 | line-height: 20 | font weight: 400
            </Typography>
        </>
    );
};

export default Body2;
