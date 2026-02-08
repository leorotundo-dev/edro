"use client";

import { useState } from "react";
import SettingsModal from "./SettingsModal";
import DetailModal from "./DetailModal";
import NewIntegrationModal from "./NewIntegrationModal";
import RemoveModal from "./RemoveModal";
import {
  Box,
  Button,
  Card,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Select,
  Switch,
  Typography,
  useTheme,
} from "@mui/material";
import Image from "next/image";
import BlankCard from "../../shared/BlankCard";
import { IconCirclePlus, IconDots, IconSettings } from "@tabler/icons-react";

type Integration = {
  name: string;
  desc: string;
  icon: string;
  icondark?: string;
  enabled: boolean;
};

export const integrations = [
  {
    name: "Gmail",
    desc: "Integrate Gmail to send, receive, and manage emails directly from your workspace.",
    icon: "/images/inetegrationpage/Gmail.svg",
    enabled: false,
  },
  {
    name: "Google Meet",
    desc: "Connect your Google Meet account for seamless video conferencing.",
    icon: "/images/inetegrationpage/Google Meet.svg",
    enabled: false,
  },
  {
    name: "Linear",
    desc: "Integrate Linear to manage issues, track progress, and streamline your team’s.",
    icon: "/images/inetegrationpage/Linear.svg",
    enabled: false,
  },
  {
    name: "Loom",
    desc: "Integrate Loom to easily record, share, and manage video messages.",
    icon: "/images/inetegrationpage/Loom.svg",
    enabled: false,
  },
  {
    name: "Zoom",
    desc: "Integrate Zoom to streamline your virtual meetings and team collaborations.",
    icon: "/images/inetegrationpage/Zoom.svg",
    enabled: true,
  },
  {
    name: "Mailchimp",
    desc: "Connect Mailchimp to streamline your email marketing—automate campaigns.",
    icon: "/images/inetegrationpage/Mailchimp.svg",
    icondark: "/images/inetegrationpage/Mailchimpdark.svg",
    enabled: true,
  },
  {
    name: "Notion",
    desc: "Capture, organize, and tackle your to-dos from anywhere.",
    icon: "/images/inetegrationpage/Notion.svg",
    enabled: false,
  },
  {
    name: "Trello",
    desc: "Capture, organize, and tackle your to-dos from anywhere.",
    icon: "/images/inetegrationpage/Trello.svg",
    enabled: false,
  },
  {
    name: "Jira",
    desc: "Track issues and manage projects with ease and full team visibility.",
    icon: "/images/inetegrationpage/Jira.svg",
    enabled: false,
  },
];

function Integartionpage() {
  const [integrationStates, setIntegrationStates] = useState(integrations);
  const [showSettingModal, setShowSettingModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showNewIntegrationModal, setShowNewIntegrationModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [_, setSelectedIntegration] = useState<Integration | null>(null);

  const theme = useTheme();

  return (
    <Card sx={{ padding: 3 }}>
      <Box
        sx={{
          display: "flex",
          gap: 2,
          justifyContent: "space-between",
          mb: 2.5,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography variant="h5">Integrations</Typography>
        </Box>
        <Box>
          <Button
            color="primary"
            variant="contained"
            onClick={() => setShowNewIntegrationModal(true)}
            startIcon={<IconCirclePlus size={20} />}
          >
            Add New Integration
          </Button>
        </Box>
      </Box>
      <Grid container spacing={5}>
        {integrationStates.map((integration, idx) => {
          const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
          const open = Boolean(anchorEl);

          const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
            setAnchorEl(event.currentTarget);
          };

          const handleClose = () => {
            setAnchorEl(null);
          };

          return (
            <Grid key={idx} size={{ xs: 12, sm: 6, lg: 4 }}>
              <BlankCard>
                <Box sx={{ padding: 2.5 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 3,
                    }}
                  >
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Image
                        src={
                          theme.palette.mode === "dark" && integration.icondark
                            ? integration.icondark
                            : integration.icon
                        }
                        alt="Integration Logo"
                        height={40}
                        width={40}
                        style={{ objectFit: "contain" }}
                      />
                    </Box>

                    <IconButton onClick={handleOpen}>
                      <IconDots size={20} />
                    </IconButton>

                    <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
                      <MenuItem
                        onClick={() => {
                          setSelectedIntegration(integration);
                          setShowRemoveModal(true);
                          handleClose();
                        }}
                      >
                        Remove
                      </MenuItem>
                    </Menu>
                  </Box>

                  <Box sx={{ mt: 4 }}>
                    <Typography variant="h5" mb={1.5}>
                      {integration.name}
                    </Typography>
                    <Typography
                      variant="body1"
                      maxWidth="sm"
                      color="textSecondary"
                    >
                      {integration.desc}
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 2.5,
                    borderRadius: 0,
                    borderTop: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                      onClick={() => setShowSettingModal(true)}
                      variant="outlined"
                    >
                      <IconSettings size={19} />
                    </Button>
                    <Button
                      onClick={() => setShowDetailModal(true)}
                      variant="outlined"
                    >
                      Details
                    </Button>
                  </Box>
                  <Box>
                    <Switch
                      checked={integration.enabled}
                      onChange={() => {
                        const updated = [...integrationStates];
                        updated[idx].enabled = !updated[idx].enabled;
                        setIntegrationStates(updated);
                      }}
                    />
                  </Box>
                </Box>
              </BlankCard>
            </Grid>
          );
        })}
      </Grid>
      <SettingsModal
        open={showSettingModal}
        onClose={() => setShowSettingModal(false)}
      />
      <DetailModal
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
      />
      <NewIntegrationModal
        open={showNewIntegrationModal}
        onClose={() => setShowNewIntegrationModal(false)}
      />
      <RemoveModal
        open={showRemoveModal}
        onClose={() => setShowRemoveModal(false)}
      />
    </Card>
  );
}

export default Integartionpage;
