"use client";
import { useContext, useEffect, useState } from "react";
import {
  IconDots,
  IconLink,
  IconMessage2,
  IconTrash,
} from "@tabler/icons-react";
import EditTaskModal from "./TaskModal/EditTaskModal";
import { KanbanDataContext } from "@/app/context/kanbancontext";
import { Draggable } from "@hello-pangea/dnd";
import { patchFetcher } from "@/app/api/globalFetcher";
import { mutate } from "swr";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import {
  Avatar,
  Box,
  Chip,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useTheme,
} from "@mui/material";
import BlankCard from "../../shared/BlankCard";

interface TaskDataProps {
  task: { id: any };
  onDeleteTask: () => void;
  index: number;
  category: any;
}
const TaskData: React.FC<TaskDataProps> = ({
  task,
  onDeleteTask,
  index,
  category,
}: any) => {
  const { setError, todoCategories, setTodoCategories } =
    useContext(KanbanDataContext);
  const [openDrawer, setopenDrawer] = useState(false);
  const [editedTask, setEditedTask] = useState(task);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleShowEditDrawer = (event: any) => {
    setopenDrawer(true);
  };
  const handleCloseEditDrawer = () => {
    setopenDrawer(false);
  };

  const handleClick = (event: any) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleDeleteClick = (event: React.MouseEvent) => {
    onDeleteTask(task.id);
  };

  const handleSaveEditedTask = async (editedTaskData: { id: any }) => {
    try {
      const response = await mutate(
        "/api/kanban",
        patchFetcher("/api/kanban/edit-task", {
          taskId: editedTaskData.id,
          newData: editedTaskData,
        }),
        false
      );
      if (response.status === 200) {
        setEditedTask(editedTaskData);
        let remainingTodos = todoCategories.map((item) => {
          if (item.name === category.name) {
            let updatedChild = item.child.map((task) => {
              if (task.id === editedTaskData.id) {
                return { ...task, editedTaskData };
              }
              return task;
            });
            return { id: item.id, name: item.name, child: updatedChild };
          } else {
            return item;
          }
        });
        setTodoCategories(remainingTodos);
      } else {
        throw new Error("Failed to edit task");
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  useEffect(() => {}, [editedTask]);

  const backgroundColor =
    editedTask?.priority === "Normal Priority"
      ? "grey.100"
      : editedTask?.priority === "Medium Priority"
      ? "warning.light"
      : editedTask?.priority === "High Priority"
      ? "error.light"
      : "grey.100";

  const theme = useTheme();
  const textColor =
    editedTask?.priority === "Medium Priority"
      ? theme.palette.warning.main || "purple"
      : editedTask?.priority === "High Priority"
      ? theme.palette.error.main
      : editedTask?.priority === "Normal Priority"
      ? theme.palette.text.secondary
      : theme.palette.text.secondary;

  return (
    <Draggable draggableId={String(task?.id)} index={index}>
      {(provided: any) => (
        <Box
          mb={0.9}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          ref={provided.innerRef}
        >
          <BlankCard>
            <Box
              p={1.5}
              display="flex"
              flexDirection="column"
              justifyContent="space-between"
              gap={1.5}
              onClick={handleShowEditDrawer}
            >
              {editedTask?.taskImage && (
                <img
                  src={editedTask?.taskImage}
                  alt="Task Image"
                  style={{ maxWidth: "100%", height: "auto" }}
                />
              )}
              <Typography variant="h6">{editedTask?.taskTitle}</Typography>
              <Box display="flex" justifyContent="space-between">
                <Box
                  component="ul"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    padding: 0,
                    listStyle: "none",
                    m: 0,
                  }}
                >
                  {editedTask?.assignedTo.slice(0, 4).map(
                    (
                      item: {
                        length: number;
                        avatar: string | undefined;
                        name: string | undefined;
                      },
                      index: number
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
                          src={item.avatar}
                          alt={item.name}
                          sx={{ width: 30, height: 30, fontSize: 14 }}
                        />
                      </Box>
                    )
                  )}

                  {editedTask?.assignedTo.length > 4 && (
                    <Box
                      component="li"
                      sx={{
                        ml: -1,
                        zIndex: 1,
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 28,
                          height: 28,
                          backgroundColor: "background.default",
                          color: "blackColor.black60",
                          fontSize: 14,
                        }}
                      >
                        +{editedTask.assignedTo.length - 4}
                      </Avatar>
                    </Box>
                  )}
                </Box>

                <Chip
                  label={editedTask?.priority}
                  size="small"
                  sx={{
                    backgroundColor,
                    color: textColor as string,
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 400,
                  }}
                />
              </Box>
              <Divider sx={{ borderColor: "blackColor.black10" }} />
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box display="flex" gap={2.5}>
                  <Box display="flex" flexDirection="row" gap={1}>
                    <IconLink size="20px" />
                    <Typography
                      sx={{
                        color: "blackColor.black60",
                      }}
                      variant="body1"
                    >
                      {editedTask?.attachments.length}
                    </Typography>
                  </Box>
                  <Box display="flex" flexDirection="row" gap={1}>
                    <IconMessage2 size="20px" />
                    <Typography variant="body1">
                      {editedTask?.comments.length}
                    </Typography>
                  </Box>
                </Box>
                <IconButton
                  aria-label="more"
                  aria-controls="long-menu"
                  aria-haspopup="true"
                  onClick={handleClick}
                >
                  <IconDots size="20px" />
                </IconButton>
                <Menu
                  id="long-menu"
                  anchorEl={anchorEl}
                  keepMounted
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                >
                  <MenuItem onClick={handleDeleteClick}>
                    <ListItemIcon>
                      <IconTrash size="1.2rem" />
                    </ListItemIcon>
                    <ListItemText> Delete</ListItemText>
                  </MenuItem>
                </Menu>
              </Box>
            </Box>

            <EditTaskModal
              show={openDrawer}
              onHide={handleCloseEditDrawer}
              task={task}
              editedTask={editedTask}
              onSave={handleSaveEditedTask}
            />
          </BlankCard>
        </Box>
      )}
    </Draggable>
  );
};
export default TaskData;
