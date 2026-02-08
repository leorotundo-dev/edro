"use client";
import React from 'react';
import { Typography } from '@mui/material';

const TextSuccess = () => {
    return (
        <>
            <Typography
                variant="h5"
                sx={{ color: (theme) => theme.palette.success.main }}
            >
                Text Success
            </Typography>

            <Typography
                variant="body1"
                sx={{ color: (theme) => theme.palette.success.main }}
            >
                Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quos
                blanditiis tenetur
            </Typography>
        </>
    );
};

export default TextSuccess;
