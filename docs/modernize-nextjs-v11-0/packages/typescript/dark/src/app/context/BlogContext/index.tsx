'use client'
import React, { createContext, useState, useEffect, ReactNode, Dispatch, SetStateAction } from 'react';
import { BlogType, BlogPostType } from '../../(DashboardLayout)/types/apps/blog';
import { getFetcher } from '@/app/api/globalFetcher';
import useSWR from 'swr'

// Define BlogContextProps interface
export interface BlogContextProps {
    posts: BlogPostType[];
    sortBy: string;
    selectedPost: BlogPostType | null;
    isLoading: boolean;
    setPosts: Dispatch<SetStateAction<BlogPostType[]>>;
    setSortBy: Dispatch<SetStateAction<string>>;
    setSelectedPost: Dispatch<SetStateAction<BlogPostType | null>>;
    setLoading: Dispatch<SetStateAction<boolean>>;
    addComment: (postId: number | string, newComment: BlogType) => void;
    error: Error | null
}

// Create context with default values
export const BlogContext = createContext<BlogContextProps>({
    posts: [],
    sortBy: 'newest',
    selectedPost: null,
    isLoading: true,
    setPosts: () => { },
    setSortBy: () => { },
    setSelectedPost: () => { },
    setLoading: () => { },
    addComment: () => { },
    error: null
});

// BlogProvider component
export const BlogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [posts, setPosts] = useState<BlogPostType[]>([]);
    const [sortBy, setSortBy] = useState<string>('newest');
    const [selectedPost, setSelectedPost] = useState<BlogPostType | null>(null);
    const [isLoading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    // Fetch Post data from the API
    const { data: postsData, isLoading: isPostsLoading, error: postsError } = useSWR('/api/blog', getFetcher);

    useEffect(() => {
        if (postsData) {
            setPosts(postsData.data);
            setLoading(isPostsLoading);
        }
        else if (postsError) {
            setError(postsError);
            setLoading(isPostsLoading);
        }
        else {
            setLoading(isPostsLoading);
        }
    }, [postsData, postsError, isPostsLoading]);

    // Adds a new comment to a specific post by updating the state.
    const addComment = (postId: number | string, newComment: BlogType) => {
        setPosts((prevPosts) =>
            prevPosts.map((post) =>
                post.id === postId ? { ...post, comments: [newComment, ...(post.comments || [])] } : post
            )
        );
    }


    const value: BlogContextProps = {
        posts,
        sortBy,
        selectedPost,
        isLoading,
        setPosts,
        setSortBy,
        setSelectedPost,
        setLoading,
        addComment,
        error
    };

    return <BlogContext.Provider value={value}>{children}</BlogContext.Provider>;
};