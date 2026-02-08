"use client";

import { useState } from "react";
import SimpleBar from "simplebar-react";

import GenerateApiKeyModal from "./GenerateApiKeyModal";
import {
  Box,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  useTheme,
  Tooltip,
  Switch,
  TextField,
  Chip,
  IconButton,
} from "@mui/material";
import {
  IconCheck,
  IconCirclePlus,
  IconCopy,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";

const apiKeys = [
  {
    id: 1,
    name: "Web Client API Key",
    key: "web_live_************5182",
    status: "Active",
    created: "11 Feb, 2025",
    lastUsed: "Today, 09:30 AM",
    enabled: true,
  },
  {
    id: 2,
    name: "Development API key",
    key: "dev_live_************9471",
    status: "Active",
    created: "19 Dec, 2024",
    lastUsed: "Today, 01:30 AM",
    enabled: true,
  },
  {
    id: 3,
    name: "Production API Key",
    key: "pro_live_************3845",
    status: "Disabled",
    created: "23 Mar, 2024",
    lastUsed: "Today, 06:30 PM",
    enabled: false,
  },
];

function ApiKeys() {
  const [keysData, setKeysData] = useState(apiKeys);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteKeyId, setDeleteKeyId] = useState<number | null>(null);

  const theme = useTheme();
  const handleToggle = (id: any) => {
    setKeysData((prev) =>
      prev.map((k) =>
        k.id === id
          ? {
              ...k,
              enabled: !k.enabled,
              status: k.enabled ? "Disabled" : "Active",
            }
          : k
      )
    );
  };

  const handleCopy = (id: number, keyValue: string) => {
    navigator.clipboard.writeText(keyValue);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000); // reset after 2s
  };

  const handleDelete = (id: number) => {
    setDeleteKeyId(id);
    setOpenDeleteDialog(true);
  };
  // Handle closing delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  // Handle confirming deletion of selected products
  const handleConfirmDelete = async () => {
    if (deleteKeyId !== null) {
      setKeysData((prev) => prev.filter((key) => key.id !== deleteKeyId));
    }
    setOpenDeleteDialog(false);
    setDeleteKeyId(null); // reset after delete
  };
  return (
    <>
      <Card>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { sm: "center" },
            justifyContent: "space-between",
            py: 2,
            px: 0.5,
            gap: 5,
            borderBottom: `1px solid ${theme.palette.divider}`,
            borderRadius: 0,
          }}
        >
          <Box>
            <Typography variant="h5">API Keys</Typography>
            <Typography variant="body1" color="textSecondary">
              API keys are used to authenticate requests to the niceadmin API
            </Typography>
          </Box>

          <Box>
            <Button
              variant="contained"
              startIcon={<IconCirclePlus size={20} />}
              onClick={() => setShowModal(true)}
            >
              Generate API key
            </Button>
          </Box>
        </Box>

        <SimpleBar>
          <Box>
            <Table>
              <TableHead sx={{ minWidth: "100%" }}>
                <TableRow>
                  <TableCell
                    sx={{ px: 0.5, fontSize: "14px", fontWeight: 600 }}
                  >
                    Name
                  </TableCell>
                  <TableCell sx={{ fontSize: "14px", fontWeight: 600 }}>
                    Status
                  </TableCell>
                  <TableCell sx={{ fontSize: "14px", fontWeight: 600 }}>
                    Created
                  </TableCell>
                  <TableCell sx={{ fontSize: "14px", fontWeight: 600 }}>
                    Last used
                  </TableCell>
                  <TableCell sx={{ fontSize: "14px", fontWeight: 600 }}>
                    Disable/Enable
                  </TableCell>
                  <TableCell sx={{ fontSize: "14px", fontWeight: 600 }}>
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {keysData.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell
                      sx={{ whiteSpace: "nowrap", px: 0.5, minWidth: "384px" }}
                    >
                      <Typography variant="subtitle1" fontWeight={600}>
                        {key.name}
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                          mt: 1,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            overflow: "hidden",
                            border: `1px solid ${theme.palette.divider}`,
                          }}
                        >
                          <TextField
                            value={key.key}
                            fullWidth
                            variant="standard"
                            sx={{
                              backgroundColor: "transparent",
                              minWidth: 0,
                              borderRight: `1px solid ${theme.palette.divider}`,
                            }}
                            slotProps={{
                              input: {
                                readOnly: true,
                                sx: {
                                  px: 1.5,
                                  py: 1,
                                },
                                disableUnderline: true,
                              },
                            }}
                          />

                          <Button
                            onClick={() => handleCopy(key.id, key.key)}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              px: 1.5,
                              py: 1,
                              borderRadius: 0,
                              minWidth: "fit-content",
                            }}
                          >
                            {copied === key.id ? (
                              <>
                                <IconCheck size={20} />
                                Copied
                              </>
                            ) : (
                              <>
                                <IconCopy size={20} />
                                Copy
                              </>
                            )}
                          </Button>
                        </Box>

                        <Tooltip title="Regenerate" placement="top">
                          <Button
                            sx={{
                              minHeight: "40px",
                            }}
                          >
                            <IconRefresh size={20} />
                          </Button>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {key.status === "Active" ? (
                        <Chip
                          label="Active"
                          sx={{
                            backgroundColor: "success.light",
                            color: "success.main",
                          }}
                        />
                      ) : (
                        <Chip
                          label="Disabled"
                          sx={{
                            backgroundColor: "error.light",
                            color: "error.main",
                          }}
                        />
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography variant="body1">{key.created}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1">{key.lastUsed}</Typography>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={key.enabled}
                        onChange={() => handleToggle(key.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Delete" placement="top">
                        <IconButton onClick={() => handleDelete(key.id)}>
                          <IconTrash size={20} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </SimpleBar>
        <GenerateApiKeyModal
          open={showModal}
          onClose={() => setShowModal(false)}
        />
      </Card>

      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        maxWidth="sm"
      >
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete this API key?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmDelete}
          >
            Delete
          </Button>
          <Button color="error" onClick={handleCloseDeleteDialog}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default ApiKeys;
