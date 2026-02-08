import React from "react";
import { Avatar, Badge, Stack } from "@mui/material";

const WithBadgeAvatar = () => {
    return (
        <Stack direction="row" spacing={1} justifyContent="center">
            <Badge
                overlap="circular"
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                variant="dot"
                color="success"
            >
                <Avatar alt="Remy Sharp" src="/images/profile/user-1.jpg" />
            </Badge>
            <Badge
                overlap="circular"
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                variant="dot"
                color="warning"
            >
                <Avatar alt="Travis Howard" src="/images/profile/user-2.jpg" />
            </Badge>
            <Badge
                overlap="circular"
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                variant="dot"
                color="error"
            >
                <Avatar alt="Cindy Baker" src="/images/profile/user-3.jpg" />
            </Badge>
        </Stack>
    );
};

export default WithBadgeAvatar;
