"use client";
import React from 'react';
import { Typography } from '@mui/material';

const Body1 = () => {
    return (
        <>
            <Typography variant="body1">
                body1. Lorem ipsum dolor sit amet, consectetur adipisicing
                elit. Quos blanditiis tenetur
            </Typography>
            <Typography variant="body1" color="textSecondary">
                font size: 16 | line-height: 24 | font weight: 400
            </Typography>
        </>
    );
};

export default Body1;
