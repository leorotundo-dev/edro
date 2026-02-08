"use client";
import React, { useState, useEffect } from "react";
import {
  Button,
  TextField,
  Typography,
  Drawer,
  Box,
  Avatar,
  IconButton,
  Stack,
  Tabs,
  Tab,
  LinearProgress,
  Checkbox,
  MenuItem,
  useTheme,
  ListItemText,
  Popover,
  Autocomplete,
} from "@mui/material";
import CustomTextField from "@/app/components/forms/theme-elements/CustomTextField";
import CustomSelect from "@/app/components/forms/theme-elements/CustomSelect";

import {
  IconCalendar,
  IconCircleLetterX,
  IconCirclePlus,
  IconFileUpload,
  IconFlag,
  IconFocus,
  IconPlus,
  IconTag,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import CustomCheckbox from "@/app/components/forms/theme-elements/CustomCheckbox";
import {
  AllassignedTo,
  AllLabels,
  KanbanData,
  TaskProperties,
} from "../kanbanData";

function EditTaskModal({ show, onHide, editedTask, onSave }: any) {
  const [tempEditedTask, setTempEditedTask] = useState(editedTask);
  const [newSubtaskInputVisible, setNewSubtaskInputVisible] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newImageInputVisible, setNewImageInputVisible] = useState(false);
  const [newImageUrlInput, setNewImageUrlInput] = useState("");
  const [tab, setTab] = useState(0);
  const [comment, setComment] = useState("");
  const [assignedTo, setAssignedTo] = useState(tempEditedTask?.assignedTo);
  const [anchorEl, setAnchorEl] = useState(null);

  const subtasks = tempEditedTask?.subtasks || [];
  const completed = subtasks.filter(
    (s: { isCompleted: any }) => s.isCompleted
  ).length;
  const total = subtasks.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  const currentCategory = KanbanData.find((category) =>
    category.child.some((childTask) => childTask.id === tempEditedTask?.id)
  );
  const theme = useTheme();

  useEffect(() => {
    setTempEditedTask(
      (prevTask: {
        assignedTo: any;
        priority: any;
        dueDate: any;
        labels: any;
        status: any;
      }) => ({
        ...editedTask,
        assignedTo: prevTask?.assignedTo || [
          { name: "Default User", avatar: "/images/kanban/avtar/avtar1.svg" },
        ],
        priority: prevTask?.priority || "Normal Priority",
        dueDate: prevTask?.dueDate || dayjs().format("DD MMM"),
        labels: prevTask?.labels || ["Design", "Sales"],
      })
    );
  }, [editedTask]);

  const statusName = currentCategory?.name || "New Request";

  const handleConfirmAddImage = () => {
    const trimmedUrl = newImageUrlInput.trim();
    if (trimmedUrl) {
      const updated = [
        ...(tempEditedTask?.attachments || []),
        { url: trimmedUrl },
      ];
      setTempEditedTask({ ...tempEditedTask, attachments: updated });
      setNewImageInputVisible(false);
      setNewImageUrlInput("");
    }
  };

  const handleToggleSubtask = (index: number) => {
    const updatedSubtasks = [...(tempEditedTask?.subtasks || [])];
    updatedSubtasks[index].isCompleted = !updatedSubtasks[index].isCompleted;
    setTempEditedTask({ ...tempEditedTask, subtasks: updatedSubtasks });
  };
  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;

    const newSubtask = {
      title: newSubtaskTitle.trim(),
      isCompleted: false,
    };

    const updatedSubtasks = [...(tempEditedTask?.subtasks || []), newSubtask];

    setTempEditedTask({
      ...tempEditedTask,
      subtasks: updatedSubtasks,
    });

    setNewSubtaskInputVisible(false);
    setNewSubtaskTitle("");
  };

  const handleChange = (e: { target: { name: any; value: any } }) => {
    const { name, value } = e.target;
    setTempEditedTask({ ...tempEditedTask, [name]: value });
  };

  const handleSaveChanges = () => {
    if (!tempEditedTask) return;

    const updatedTask = {
      ...tempEditedTask,
      assignedTo,
    };

    onSave(updatedTask);
    onHide();
  };

  const handlePriorityChange = (event: any) => {
    setTempEditedTask({ ...tempEditedTask, priority: event.target.value });
  };

  const handleLabelChange = (newLabels: string[]) => {
    setTempEditedTask((prev: any) => ({ ...prev, labels: newLabels }));
  };

  const handleDueDateChange = (date: any) => {
    setTempEditedTask({
      ...tempEditedTask,
      dueDate: dayjs(date).format("DD MMM"),
    });
  };

  const handleRemoveAttachment = (index: number) => {
    const updated = [...tempEditedTask.attachments];
    updated.splice(index, 1);
    setTempEditedTask({ ...tempEditedTask, attachments: updated });
  };

  const handlePlusClick = (event: any) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };
  const handleUserSelect = (user: { name: any; avatar?: string }) => {
    const exists = assignedTo.some((u: any) => u.name === user.name);
    if (exists) {
      setAssignedTo(assignedTo.filter((u: any) => u.name !== user.name));
    } else {
      setAssignedTo([...assignedTo, user]);
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    dayjs(tempEditedTask?.dueDate, "DD MMM")
  );

  const handleDateChange = (newValue: any) => {
    setSelectedDate(newValue);
    handleDueDateChange(newValue);
    setIsEditing(false);
  };

  return (
    <Drawer
      anchor="right"
      open={show}
      onClose={onHide}
      slotProps={{
        paper: {
          sx: {
            width: "480px",
          },
        },
      }}
    >
      <Box padding={3} display="flex" gap={3} flexDirection="column">
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          gap={2}
        >
          <CustomTextField
            fullWidth
            name="taskTitle"
            value={tempEditedTask?.taskTitle}
            onChange={handleChange}
          />
          <Box>
            <IconButton onClick={onHide} sx={{ padding: 0 }}>
              <IconCircleLetterX size={24} />
            </IconButton>
          </Box>
        </Box>

        <Box
          sx={{
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: "16px",
            p: 2,
            boxShadow: "0px 3px 6px 0px #0000000A",
          }}
        >
          <Stack spacing={2}>
            {/* Priority */}
            <Box display="flex" alignItems="center" gap={5}>
              <Box display="flex" alignItems="center" gap={1} minWidth={120}>
                <IconFlag size={20} />
                <Typography fontWeight={700} color="blackColor.black80">
                  Priority:
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" flexWrap="wrap" gap={1}>
                <CustomSelect
                  fullWidth
                  id="taskProperty"
                  variant="outlined"
                  value={tempEditedTask?.priority}
                  onChange={handlePriorityChange}
                >
                  {TaskProperties?.map((property) => (
                    <MenuItem value={property}>{property}</MenuItem>
                  ))}
                </CustomSelect>
              </Box>
            </Box>
            {/* Status */}
            <Box display="flex" alignItems="start" gap={5}>
              <Box display="flex" alignItems="center" gap={1} minWidth={120}>
                <IconFocus size={20} />
                <Typography fontWeight={700} color="blackColor.black80">
                  Status:
                </Typography>
              </Box>
              <Typography
                color="text.background.paper"
                variant="body1"
                fontWeight={500}
              >
                {statusName}
              </Typography>
            </Box>

            {/* Labels */}
            <Box
              display="flex"
              alignItems="center"
              gap={5}
              flexWrap="nowrap"
              width="100%"
            >
              <Box
                display="flex"
                alignItems="center"
                gap={1}
                minWidth={120}
                flexShrink={0}
              >
                <IconTag size={20} />
                <Typography fontWeight={700} color="blackColor.black80">
                  Labels:
                </Typography>
              </Box>

              <Box flex={1}>
                <Autocomplete
                  multiple
                  fullWidth
                  id="tags-outlined"
                  options={AllLabels}
                  value={tempEditedTask?.labels ?? []}
                  onChange={(event, newValue) => handleLabelChange(newValue)}
                  filterSelectedOptions
                  renderInput={(params) => <CustomTextField {...params} />}
                />
              </Box>
            </Box>
            {/* Due Date */}
            <Box display="flex" alignItems="start" gap={5}>
              <Box display="flex" alignItems="center" gap={1} minWidth={120}>
                <IconCalendar size={20} />
                <Typography fontWeight={700} color="blackColor.black80">
                  Due date:
                </Typography>
              </Box>
              {!isEditing ? (
                <Typography
                  variant="body1"
                  sx={{ cursor: "pointer", color: "blackColor.black60" }}
                  onClick={() => setIsEditing(true)}
                >
                  {selectedDate.format("DD MMM YYYY")}
                </Typography>
              ) : (
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    value={selectedDate}
                    onChange={handleDateChange}
                    onClose={() => setIsEditing(false)}
                    slotProps={{
                      textField: {
                        fullWidth: false,
                        variant: "outlined",
                        size: "small",
                      },
                    }}
                  />
                </LocalizationProvider>
              )}
            </Box>

            <Box>
              <Box display="flex" alignItems="center" gap={5}>
                <Box display="flex" alignItems="center" gap={1} minWidth={120}>
                  <IconUsers size={20} />
                  <Typography fontWeight={700} color="blackColor.black80">
                    Assigned To:
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    padding: 0,
                    listStyle: "none",
                    m: 0,
                  }}
                >
                  {assignedTo?.map(
                    (
                      item: {
                        length: number;
                        avatar: string | undefined;
                        name: string | undefined;
                      },
                      index: any
                    ) => (
                      <Box
                        key={index}
                        component="li"
                        sx={{
                          ml: index === 0 ? 0 : -1,
                          zIndex: item.length - index,
                        }}
                      >
                        <Avatar
                          key={index}
                          src={item.avatar}
                          alt={item.name}
                          sx={{
                            width: 30,
                            height: 30,
                          }}
                        />
                      </Box>
                    )
                  )}
                  <IconButton onClick={handlePlusClick}>
                    <IconCirclePlus />
                  </IconButton>
                </Box>
              </Box>

              <Popover
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                slotProps={{
                  paper: {
                    sx: {
                      width: 320,
                      p: 2,
                      borderRadius: 2,
                      boxShadow: 3,
                    },
                  },
                }}
              >
                <Typography
                  fontWeight={700}
                  color="blackColor.black80"
                  variant="h6"
                  sx={{ mb: 1 }}
                >
                  Assign Users
                </Typography>

                {/* User List */}
                <Box sx={{ maxHeight: 300, overflowY: "auto" }}>
                  {AllassignedTo?.map((user) => (
                    <Box
                      key={user.name}
                      onClick={() => handleUserSelect(user)}
                      display="flex"
                      alignItems="center"
                      p={0.7}
                      sx={{
                        cursor: "pointer",
                        "&:hover": {
                          backgroundColor: "action.hover",
                          borderRadius: 1,
                        },
                      }}
                    >
                      <CustomCheckbox
                        edge="start"
                        checked={assignedTo?.some(
                          (u: { name: string }) => u.name === user.name
                        )}
                      />
                      <Avatar
                        src={user.avatar}
                        alt={user.name}
                        sx={{
                          marginRight: 1,
                          width: 32,
                          height: 32,
                        }}
                      />
                      <ListItemText
                        primary={user.name}
                        sx={{ fontWeight: 500 }}
                      />
                    </Box>
                  ))}
                </Box>
              </Popover>
            </Box>
          </Stack>
        </Box>
        <Box mt={3}>
          <Typography
            variant="body1"
            fontWeight={700}
            color="blackColor.black80"
          >
            Description:
          </Typography>
          <CustomTextField
            multiline
            fullWidth
            variant="outlined"
            rows={3}
            name="taskText"
            value={tempEditedTask?.taskText}
            onChange={handleChange}
            sx={{
              mt: 2,
              "& .MuiOutlinedInput-root": {
                fontWeight: "400",
                fontSize: "16px",
                color: "blackColor.black80",
                p: 0,
              },
            }}
          />
        </Box>
        <Box>
          <Typography
            variant="h6"
            fontWeight={700}
            mb={2}
            color="blackColor.black80"
          >
            Attachments:
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {tempEditedTask?.attachments?.map(
              (attachment: any, idx: number) => (
                <Box
                  key={idx}
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 1,
                    overflow: "hidden",
                    border: "1px solid #eee",
                    position: "relative",
                  }}
                >
                  <img
                    src={attachment.url}
                    alt={`attachment-${idx}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                  <IconButton
                    onClick={() => handleRemoveAttachment(idx)}
                    sx={{
                      position: "absolute",
                      top: 2,
                      right: 2,
                      padding: 0,
                      backgroundColor: "gray",
                      color: "white",
                    }}
                  >
                    <IconX size={20} />
                  </IconButton>
                </Box>
              )
            )}

            {/* Inline URL input box (instead of prompt) */}
            {newImageInputVisible ? (
              <Box sx={{ width: "100%" }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Enter image URL"
                  value={newImageUrlInput}
                  onChange={(e) => setNewImageUrlInput(e.target.value)}
                />
                <Box mt={1} display="flex" gap={1}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleConfirmAddImage}
                    disabled={!newImageUrlInput.trim()}
                  >
                    Add
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      setNewImageInputVisible(false);
                      setNewImageUrlInput("");
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box
                onClick={() => setNewImageInputVisible(true)}
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: 1,
                  border: "2px solid gray",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#888",
                  fontSize: "14px",
                  textAlign: "center",
                }}
              >
                <IconFileUpload size={20} />
              </Box>
            )}
          </Box>
        </Box>
        <Box borderBottom={1} borderColor="divider">
          <Tabs value={tab} onChange={(e, newVal) => setTab(newVal)}>
            <Tab label="Comments" />
            <Tab label="Subtasks" />
          </Tabs>
        </Box>
        {tab === 0 && (
          <Box>
            {tempEditedTask?.comments?.map((c: any, idx: any) => (
              <Box key={idx} display="flex" gap={2} mb={2}>
                <Avatar src={c.avatar} sx={{ width: "45px" }} />
                <Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Typography
                      fontWeight={600}
                      color="blackColor.black80"
                      sx={{ mr: 1 }}
                    >
                      {c.author}
                    </Typography>
                    <Typography variant="body1" color="blackColor.black80">
                      {c.date}
                    </Typography>
                  </Box>

                  <Typography mt={2} color="blackColor.black80">
                    {c.text}
                  </Typography>
                </Box>
              </Box>
            ))}
            {/* New Comment */}
            <Box display="flex" mt={2}>
              <Avatar src="/images/profile/user-1.jpg" sx={{ mr: 2 }} />
              <Box flex={1}>
                <CustomTextField
                  value={comment}
                  onChange={(e: {
                    target: { value: React.SetStateAction<string> };
                  }) => setComment(e.target.value)}
                  fullWidth
                  placeholder="Write a comment"
                />
                <Box display="flex" justifyContent="flex-end" mt={1}>
                  <Button
                    variant="contained"
                    onClick={() => {
                      if (comment.trim()) {
                        const newComment = {
                          author: "Michael Garner",
                          avatar: "/images/profile/user-1.jpg",
                          date: dayjs().format("DD MMM YYYY"),
                          text: comment.trim(),
                        };
                        const updatedComments = [
                          ...(tempEditedTask.comments || []),
                          newComment,
                        ];
                        setTempEditedTask({
                          ...tempEditedTask,
                          comments: updatedComments,
                        });
                        setComment("");
                      }
                    }}
                  >
                    Submit Comment
                  </Button>
                </Box>
              </Box>
            </Box>
          </Box>
        )}

        {tab === 1 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {completed} of {total}
            </Typography>

            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: 5,
                mb: 1,
                backgroundColor: theme.palette.primary.light,
                "& .MuiLinearProgress-bar": {
                  backgroundColor: theme.palette.primary.main,
                },
              }}
            />

            {subtasks?.map((subtask: any, idx: any) => (
              <Box key={idx} display="flex" alignItems="center" mb={1}>
                <Checkbox
                  checked={subtask.isCompleted}
                  onChange={() => handleToggleSubtask(idx)}
                  sx={{
                    color: theme.palette.primary.main,
                  }}
                />
                <Typography>{subtask.title}</Typography>
              </Box>
            ))}

            {newSubtaskInputVisible ? (
              <Box mt={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="New subtask"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                />
                <Box mt={1} display="flex" gap={1}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleAddSubtask}
                    disabled={!newSubtaskTitle.trim()}
                  >
                    Add
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      setNewSubtaskInputVisible(false);
                      setNewSubtaskTitle("");
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            ) : (
              <Button
                startIcon={<IconPlus />}
                sx={{
                  mt: 1,
                  textTransform: "none",
                  color: theme.palette.primary.main,
                  backgroundColor: theme.palette.background.default,
                  borderRadius: 2,
                  px: 2,
                  py: 0.5,
                }}
                onClick={() => setNewSubtaskInputVisible(true)}
              >
                Add Subtask
              </Button>
            )}
          </Box>
        )}
        <Box display="flex" justifyContent="flex-start" gap={1}>
          <Button
            onClick={handleSaveChanges}
            size="small"
            color="primary"
            variant="contained"
          >
            Update
          </Button>
          <Button size="small" onClick={onHide}>
            Cancel
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}
export default EditTaskModal;
