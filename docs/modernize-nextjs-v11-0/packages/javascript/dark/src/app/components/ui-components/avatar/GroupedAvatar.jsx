import { Avatar, AvatarGroup, Stack } from "@mui/material";

const GroupedAvatar = () => {
    return (
        <Stack direction="row" spacing={1} justifyContent="center">
            <AvatarGroup max={4}>
                <Avatar alt="Remy Sharp" src="/images/profile/user-1.jpg" />
                <Avatar alt="Travis Howard" src="/images/profile/user-2.jpg" />
                <Avatar alt="Cindy Baker" src="/images/profile/user-3.jpg" />
                <Avatar alt="Agnes Walker" src="/images/profile/user-4.jpg" />
                <Avatar alt="Trevor Henderson" src="/images/profile/user-5.jpg" />
            </AvatarGroup>
        </Stack>
    );
};

export default GroupedAvatar;
