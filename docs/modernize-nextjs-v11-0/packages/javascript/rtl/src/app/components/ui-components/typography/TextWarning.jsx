"use client";
import React from 'react';
import { Typography } from '@mui/material';

const TextWarning = () => {
    return (
        <>
            <Typography
                variant="h5"
                sx={{ color: (theme) => theme.palette.warning.main }}
            >
                Text Warning
            </Typography>

            <Typography
                variant="body1"
                sx={{ color: (theme) => theme.palette.warning.main }}
            >
                Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quos
                blanditiis tenetur
            </Typography>
        </>
    );
};

export default TextWarning;
