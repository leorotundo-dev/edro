"use client";
import { SetStateAction, useContext, useEffect, useState } from "react";
import {
  IconChecks,
  IconCirclePlus,
  IconDotsVertical,
} from "@tabler/icons-react";
import TaskData from "./TaskData";
import EditCategoryModal from "./TaskModal/EditCategoryModal";

import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { KanbanDataContext } from "@/app/context/kanbancontext";

import { postFetcher } from "@/app/api/globalFetcher";
import {
  Box,
  IconButton,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { mutate } from "swr";


import { CustomizerContext } from "@/app/context/customizerContext";
import BlankCard from "../../shared/BlankCard";

function CategoryTaskList({ id }: any) {
  const theme = useTheme();
  const { todoCategories, deleteCategory, clearAllTasks, setTodoCategories } =
    useContext(KanbanDataContext);
  const category = todoCategories.find((cat) => cat.id === id) as any;
  const [allTasks, setAllTasks] = useState(category ? category.child : []);
  const [newCategoryName, setNewCategoryName] = useState(category.name);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [showContainer, setShowContainer] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [showInlineInput, setShowInlineInput] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const { isBorderRadius } = useContext(CustomizerContext);

  const handleClick = (event: any) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Find the category and update tasks
  useEffect(() => {
    const category = todoCategories.find((cat) => cat.id === id);
    if (category) {
      setAllTasks(category.child);
    }
  }, [todoCategories, id]);

  //  Shows the modal for editing a category.
  const handleShowEditCategoryModal = () => {
    handleClose();
    setShowEditCategoryModal(true);
  };
  //Closes the modal for editing a category.
  const handleCloseEditCategoryModal = () => setShowEditCategoryModal(false);

  const handleUpdateCategory = async (updatedName: string) => {
    try {
      const response = await mutate(
        "/api/kanban",
        postFetcher("/api/kanban", {
          categoryId: id,
          categoryName: updatedName,
        }),
        false
      );

      if (response?.status === 200) {
        setNewCategoryName(updatedName);

        const updatedCategories = todoCategories.map((cat) => {
          if (cat.id === id) {
            return { ...cat, name: updatedName };
          }
          return cat;
        });
        setTodoCategories(updatedCategories);
      }
    } catch (error) {
      console.error("Error updating category:", error);
    }
  };

  const handleInlineAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    const newId = `${Date.now()}`;
    const newTask = {
      id: newId,
      taskTitle: newTaskTitle,
      taskText: "",
      dueDate: new Date().toISOString().split("T")[0],
      taskImage: "",
      assignedTo: [
        {
          id: "default-user-id",
          name: "Default User",
          avatar: "/images/profile/user-1.jpg",
        },
      ],
      attachments: [],
      labels: [],
      comments: [],
      priority: "Normal Priority",
      subtasks: [],
    };

    try {
      const response = await mutate(
        "/api/kanban",
        postFetcher("/api/kanban", {
          categoryId: id,
          newTaskData: newTask,
        }),
        false
      );

      if (response.status === 200) {
        const updatedCategories = todoCategories.map((item) => {
          if (item.id === id) {
            return {
              ...item,
              child: [...item.child, newTask],
            };
          }
          return item;
        });

        setTodoCategories(updatedCategories);
        setNewTaskTitle("");
        setShowInlineInput(false);
      } else {
        throw new Error("Failed to add task");
      }
    } catch (error) {
      console.error("Error adding task:", error);
    }
  };

  const handleClearAll = () => {
    setAllTasks([]);

    // Update global context state for category
    const updatedCategories = todoCategories.map((cat) =>
      cat.id === id ? { ...cat, child: [] } : cat
    );
    setTodoCategories(updatedCategories);
  };

  // Deletes a specific task.
  const handleDeleteTask = (taskId: number | any, category: any) => {
    setAllTasks((prevTasks: any[]) =>
      prevTasks.filter((task: { id: number }) => task.id !== taskId)
    );
    let remainingTodos = todoCategories.map((item) => {
      if (item.name === category.name) {
        let updatedChild = item.child.filter((task) => task.id !== taskId);
        return { id: item.id, name: item.name, child: updatedChild };
      } else {
        return item;
      }
    });
    setTodoCategories(remainingTodos);
  };

  //Handles the deletion of the current category.
  const handleDeleteClick = () => {
    setShowContainer(false);
    deleteCategory(id);
    setAllTasks([]);
  };

  const getCategoryColors = (category: any) => {
    if (!category)
      return {
        backgroundColor: "primary.light",
        badgeColor: theme.palette.primary.main,
      };

    switch (category.name) {
      case "New Request":
        return {
          backgroundColor: theme.palette.grey[100],
          badgeColor: theme.palette.error.main,
        };
      case "In Progress":
        return {
          backgroundColor: theme.palette.grey[100],
          badgeColor: theme.palette.warning.main,
        };
      case "Complete":
        return {
          backgroundColor: theme.palette.success.light,
          badgeColor: theme.palette.success.main,
        };
      case "BackLog":
        return {
          backgroundColor: theme.palette.grey[100],
          badgeColor: "grey",
        };
      default:
        return {
          backgroundColor: "primary.light",
          badgeColor: theme.palette.primary.main,
        };
    }
  };
  const { backgroundColor, badgeColor } = getCategoryColors(category);

  return (
    <>
      <Box width="280px" flexShrink="0px">
        {showContainer && category && (
          <Box
            p={0.8}
            sx={{ backgroundColor }}
            borderRadius={`${isBorderRadius}px`}
          >
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              padding="7px 12px"
            >
              <Box display="flex" alignItems="center" gap="6px">
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: badgeColor,
                  }}
                />
                <Typography fontWeight={600} fontSize={16}>
                  {newCategoryName}
                </Typography>
                <Typography
                  variant="body1"
                  color="blackColor.black40"
                  fontWeight={500}
                >
                  {}
                </Typography>
              </Box>

              <Box display="flex" alignItems="center" gap={1}>
                <Box>
                  {category.name === "New Request" && (
                    <>
                      <Tooltip title="Add Task">
                        <IconButton
                          sx={{ padding: 0 }}
                          onClick={() => setShowInlineInput(true)}
                        >
                          <IconCirclePlus />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                  <EditCategoryModal
                    showModal={showEditCategoryModal}
                    handleCloseModal={handleCloseEditCategoryModal}
                    initialCategoryName={newCategoryName}
                    handleUpdateCategory={handleUpdateCategory}
                  />
                </Box>
                <Tooltip title="Menu">
                  <IconButton onClick={handleClick} sx={{ padding: 0 }}>
                    <IconDotsVertical size="20px" />
                  </IconButton>
                </Tooltip>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                >
                  <MenuItem onClick={handleShowEditCategoryModal}>
                    Edit
                  </MenuItem>
                  <MenuItem onClick={handleDeleteClick}>Delete</MenuItem>
                  <MenuItem onClick={handleClearAll}>Clear All</MenuItem>
                </Menu>
              </Box>
            </Box>
            {allTasks?.map((task: { id: any }, index: number) => (
              <TaskData
                key={task?.id || index}
                task={task}
                onDeleteTask={() => handleDeleteTask(task.id, category)}
                index={index}
                category={category}
              />
            ))}
            {category.name === "New Request" &&
              (showInlineInput ? (
                <BlankCard>
                  <Box display="flex" alignItems="center" gap={1} p={2}>
                    <TextField
                      value={newTaskTitle}
                      onChange={(e: {
                        target: { value: SetStateAction<string> };
                      }) => setNewTaskTitle(e.target.value)}
                      placeholder="Untitled"
                    />

                    <IconButton onClick={handleInlineAddTask}>
                      <IconChecks size={24} />
                    </IconButton>
                  </Box>
                </BlankCard>
              ) : (
                <Box
                  display="flex"
                  alignItems="center"
                  onClick={() => setShowInlineInput(true)}
                  sx={{ cursor: "pointer" }}
                >
                  <Tooltip title="Add New Task">
                    <IconButton>
                      <IconCirclePlus size={28} />
                    </IconButton>
                  </Tooltip>
                  <Typography
                    variant="body1"
                    color="blackColor.black60"
                    fontWeight={500}
                  >
                    {" "}
                    Add Task
                  </Typography>
                </Box>
              ))}
          </Box>
        )}
      </Box>
    </>
  );
}
export default CategoryTaskList;
