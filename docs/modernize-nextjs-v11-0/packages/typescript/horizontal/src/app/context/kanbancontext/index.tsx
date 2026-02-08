"use client";
import React, { createContext, useState, useEffect, ReactNode } from "react";

import { TodoCategory } from "@/app/(DashboardLayout)/types/apps/kanban";
import useSWR from "swr";
import {
  deleteFetcher,
  getFetcher,
  postFetcher,
} from "@/app/api/globalFetcher";

interface KanbanDataContextProps {
  children: ReactNode;
}

interface KanbanContextType {
  todoCategories: TodoCategory[];
  addCategory: (categoryName: string) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  clearAllTasks: (categoryId: string) => Promise<void>;
  deleteTodo: (taskId: number) => Promise<void>;
  setError: (errorMessage: unknown | null) => void;
  loading: boolean;
  error: unknown | null;
  setTodoCategories: (id: TodoCategory[]) => void;
  moveTask: (
    taskId: number,
    sourceCategoryId: string,
    destinationCategoryId: string,
    sourceIndex: number,
    destinationIndex: number
  ) => void;
}

export const KanbanDataContext = createContext<KanbanContextType>(
  {} as KanbanContextType
);

export const KanbanDataContextProvider: React.FC<KanbanDataContextProps> = ({
  children,
}) => {
  const [todoCategories, setTodoCategories] = useState<TodoCategory[]>([]);
  const [error, setError] = useState<unknown | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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
    taskId: any,
    fromCategoryId: any,
    toCategoryId: any,
    destinationIndex: number
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

  const handleError = (errorMessage: unknown | null) => {
    setError(errorMessage);
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      await mutate(
        deleteFetcher("/api/kanban/delete-category", { data: { categoryId } }),
        false
      );
    } catch (error) {
      handleError(error);
    }
  };

  const clearAllTasks = async (categoryId: string) => {
    try {
      await mutate(
        deleteFetcher("/api/kanban", { data: { categoryId } }),
        false
      );
    } catch (error) {
      handleError(error);
    }
  };

  const addCategory = async (categoryName: string) => {
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

  const deleteTodo = async (taskId: number) => {
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
