"use client";
import React, { createContext, useState, useEffect, ReactNode } from "react";


import useSWR from "swr";
import {
  deleteFetcher,
  getFetcher,
  postFetcher,
} from "@/app/api/globalFetcher";



export const KanbanDataContext = createContext(
  {}
);

export const KanbanDataContextProvider = ({
  children,
}) => {
  const [todoCategories, setTodoCategories] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch todo data from the API
  const {
    data: todosData,
    isLoading: isTodosLoading,
    error: todoError,
    mutate,
  } = useSWR("/api/kanban", getFetcher);
  useEffect(() => {
    if (todosData) {
      setTodoCategories(todosData.data);
      setLoading(isTodosLoading);
    } else if (todoError) {
      setError(todoError);
      setLoading(isTodosLoading);
    } else {
      setLoading(isTodosLoading);
    }
  }, [todosData, todoError, isTodosLoading]);

  const moveTask = (
    taskId,
    fromCategoryId,
    toCategoryId,
    destinationIndex
  ) => {
    const sourceCategory = todoCategories.find(
      (cat) => cat.id === fromCategoryId
    );
    const destinationCategory = todoCategories.find(
      (cat) => cat.id === toCategoryId
    );

    if (sourceCategory && destinationCategory) {
      const taskToMove = sourceCategory.child.find(
        (task) => task.id === taskId
      );

      if (taskToMove) {
        // Remove task from source category
        const updatedSourceTasks = sourceCategory.child.filter(
          (task) => task.id !== taskId
        );

        // Insert task at the correct position in the destination category
        const updatedDestinationTasks = [...destinationCategory.child];
        updatedDestinationTasks.splice(destinationIndex, 0, taskToMove);

        // Create updated categories
        const updatedCategories = todoCategories.map((category) => {
          if (category.id === fromCategoryId) {
            return { ...category, child: updatedSourceTasks };
          }
          if (category.id === toCategoryId) {
            return { ...category, child: updatedDestinationTasks };
          }
          return category;
        });

        setTodoCategories(updatedCategories);
      }
    }
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
  };

  const deleteCategory = async (categoryId) => {
    try {
      await mutate(
        deleteFetcher("/api/kanban/delete-category", { data: { categoryId } }),
        false
      );
    } catch (error) {
      handleError(error);
    }
  };

  const clearAllTasks = async (categoryId) => {
    try {
      await mutate(
        deleteFetcher("/api/kanban", { data: { categoryId } }),
        false
      );
    } catch (error) {
      handleError(error);
    }
  };

  const addCategory = async (categoryName) => {
    try {
      const response = await mutate(
        postFetcher("/api/kanban/add-category", { categoryName }),
        false
      );
      setTodoCategories([...todoCategories, response.data]);
    } catch (error) {
      handleError(error);
    }
  };

  const deleteTodo = async (taskId) => {
    try {
      await mutate(
        deleteFetcher("/api/kanban/delete-task", { data: { taskId } }),
        false
      );
    } catch (error) {
      handleError(error);
    }
  };

  return (
    <KanbanDataContext.Provider
      value={{
        todoCategories,
        loading,
        error,
        setTodoCategories,
        addCategory,
        deleteCategory,
        clearAllTasks,
        deleteTodo,
        setError,
        moveTask,
      }}
    >
      {children}
    </KanbanDataContext.Provider>
  );
};
