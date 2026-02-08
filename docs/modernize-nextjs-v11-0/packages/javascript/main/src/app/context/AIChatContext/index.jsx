"use client";
import React, {
    createContext,
    useState,
    useEffect,
    ReactNode,
    SetStateAction,
    Dispatch,
} from "react";
import useSWR from "swr";
import { getFetcher, postFetcher } from "@/app/api/globalFetcher";

import { sendMessageToGemini } from "@/app/api/chat-ai/gemini";


// Create context
export const ChatAIContext = createContext(
    undefined
);

// Provider
export const ChatAIProvider = ({ children }) => {
    const [chatList, setChatList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [typing, setTyping] = useState(false);
    const [chatSessions, setChatSessions] = useState([]);
    const { data, error: swrError, mutate } = useSWR("/api/chat-ai", getFetcher);

    // On fetch success
    useEffect(() => {
        if (data?.data) {
            setChatList(data.data);
            setLoading(false);
        }
        if (swrError) {
            setError("Failed to fetch chat.");
            setLoading(false);
        }
    }, [data, swrError]);

    //for save  history

    const saveSession = (userText, aiText) => {
        const sessionTimestamp = Date.now();

        const newSession = {
            id: sessionTimestamp.toString(),
            title: userText,
            messages: [
                { id: sessionTimestamp, sender: "user", text: userText },
                { id: sessionTimestamp + 1, sender: "ai", text: aiText },
            ],
            timestamp: sessionTimestamp,
            status: "active",
        };

        setChatSessions((prev) => [...prev, newSession]);
    };

    const sendMessage = async (text, useGemini = true) => {
        try {
            setTyping(true);

            if (useGemini) {
                // Generate unique IDs
                const userMessage = {
                    id: Date.now(),
                    sender: "user",
                    text,
                };
                setChatList((prev) => [...prev, userMessage]);

                const aiResponse = await sendMessageToGemini(text);

                const aiMessage = {
                    id: Date.now() + 1,
                    sender: "ai",
                    text: aiResponse,
                };

                saveSession(text, aiResponse);
                setChatList((prev) => [...prev, aiMessage]);
            } else {
                const response = await postFetcher("/api/chat-ai", { text });

                const [userMsg, aiReply] = response.data;

                setChatList((prev) => [...prev, userMsg, aiReply]);

                saveSession(userMsg.text, aiReply.text);
            }
        } catch (err) {
            setError("Failed to send message");
            console.error(err);
        } finally {
            setTyping(false);
        }
    };

    return (
        <ChatAIContext.Provider
            value={{
                setTyping,
                setChatSessions,
                saveSession,
                chatSessions,
                chatList,
                setChatList,
                loading,
                error,
                typing,
                sendMessage,
            }}
        >
            {children}
        </ChatAIContext.Provider>
    );
};
