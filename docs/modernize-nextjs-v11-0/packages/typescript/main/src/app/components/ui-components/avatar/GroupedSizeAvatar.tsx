import React from "react";
import { Avatar, AvatarGroup, Stack } from "@mui/material";

const GroupedSizeAvatar = () => {
    return (
        <Stack direction="row" spacing={2} justifyContent="center">
            <AvatarGroup max={4}>
                <Avatar
                    alt="Remy Sharp"
                    src="/images/profile/user-1.jpg"
                    sx={{ width: 56, height: 56 }}
                />
                <Avatar
                    alt="Travis Howard"
                    src="/images/profile/user-2.jpg"
                    sx={{ width: 56, height: 56 }}
                />
                <Avatar
                    alt="Cindy Baker"
                    src="/images/profile/user-3.jpg"
                    sx={{ width: 56, height: 56 }}
                />
                <Avatar
                    alt="Agnes Walker"
                    src="/images/profile/user-4.jpg"
                    sx={{ width: 56, height: 56 }}
                />
            </AvatarGroup>
        </Stack>
    );
};

export default GroupedSizeAvatar;
