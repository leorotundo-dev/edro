import React from "react";
import { Avatar, Stack } from "@mui/material";

const SizesAvatar = () => {
    return (
        <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
            <Avatar
                alt="Remy Sharp"
                src="/images/profile/user-1.jpg"
                sx={{ width: 24, height: 24 }}
            />
            <Avatar alt="Travis Howard" src="/images/profile/user-2.jpg" />
            <Avatar
                alt="Cindy Baker"
                src="/images/profile/user-3.jpg"
                sx={{ width: 56, height: 56 }}
            />
            <Avatar
                alt="Agnes Walker"
                src="/images/profile/user-4.jpg"
                sx={{ width: 72, height: 72 }}
            />
        </Stack>
    );
};

export default SizesAvatar;
