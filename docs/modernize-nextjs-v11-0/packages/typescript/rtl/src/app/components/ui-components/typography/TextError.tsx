"use client";
import React from 'react';
import { Typography } from '@mui/material';

const TextError = () => {
    return (
        <>
            <Typography
                variant="h5"
                sx={{ color: (theme) => theme.palette.error.main }}
            >
                Text Error
            </Typography>

            <Typography
                variant="body1"
                sx={{ color: (theme) => theme.palette.error.main }}
            >
                Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quos
                blanditiis tenetur
            </Typography>
        </>
    );
};

export default TextError;
