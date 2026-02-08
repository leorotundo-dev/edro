import React from "react";
import { Avatar, Stack } from "@mui/material";

const VariantAvatar = () => {
    return (
        <Stack direction="row" spacing={1} justifyContent="center">
            <Avatar sx={{ bgcolor: "primary.main" }} variant="square">
                S
            </Avatar>
            <Avatar sx={{ bgcolor: "secondary.main" }} variant="rounded">
                R
            </Avatar>
            <Avatar sx={{ bgcolor: "error.main" }}>C</Avatar>
        </Stack>
    );
};

export default VariantAvatar;
