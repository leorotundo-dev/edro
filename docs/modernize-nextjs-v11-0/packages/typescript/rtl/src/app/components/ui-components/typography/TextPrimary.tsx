"use client";
import React from 'react';
import { Typography } from '@mui/material';

const TextPrimary = () => {
    return (
        <>
            <Typography
                variant="h5"
                sx={{ color: (theme) => theme.palette.primary.main }}
            >
                Text Primary
            </Typography>

            <Typography
                variant="body1"
                sx={{ color: (theme) => theme.palette.primary.main }}
            >
                Lorem ipsum dolor sit amet, consectetur adipisicing elit. Quos
                blanditiis tenetur
            </Typography>
        </>
    );
};

export default TextPrimary;
