"use client";
import CustomSocialButton from "@/app/components/forms/theme-elements/CustomSocialButton";
import { Stack } from "@mui/system";
import { Avatar, Box } from "@mui/material";
import { signInType } from "@/app/(DashboardLayout)/types/auth/auth";
import AuthContext from "@/app/context/AuthContext";
import { useContext } from "react";

const AuthSocialButtons = ({ title }: signInType) => {
  const { loginWithProvider }: any = useContext(AuthContext);

  const handleGoogle = async () => {
    try {
      await loginWithProvider("google");
    } catch (error) {
      console.error("Google login failed", error);
    }
  };

  const handleGithub = async () => {
    try {
      await loginWithProvider("github");
    } catch (error) {
      console.error("GitHub login failed", error);
    }
  };

  return (
    <>
      <Stack direction="row" justifyContent="center" spacing={2} mt={3}>
        <div onClick={handleGoogle}>
          <CustomSocialButton>
            <Avatar
              src={"/images/svgs/google-icon.svg"}
              alt={"icon1"}
              sx={{
                width: 16,
                height: 16,
                borderRadius: 0,
                mr: 1,
              }}
            />
            <Box
              sx={{
                display: { xs: "none", sm: "flex" },
                whiteSpace: "nowrap",
                mr: { sm: "3px" },
              }}
            >
              {title}{" "}
            </Box>{" "}
            Google
          </CustomSocialButton>
        </div>
        <div onClick={handleGithub}>
          <CustomSocialButton>
            <Avatar
              src={"/images/svgs/git-icon.svg"}
              alt={"icon2"}
              sx={{
                width: 25,
                height: 25,
                borderRadius: 0,
                mr: 1,
              }}
            />
            <Box
              sx={{
                display: { xs: "none", sm: "flex" },
                whiteSpace: "nowrap",
                mr: { sm: "3px" },
              }}
            >
              {title}{" "}
            </Box>{" "}
            GitHub
          </CustomSocialButton>
        </div>
      </Stack>
    </>
  );
};

export default AuthSocialButtons;
