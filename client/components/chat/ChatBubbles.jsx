"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCheck, Check, Clock } from "lucide-react";

// Message status indicator
const MessageStatus = ({ status, isMe }) => {
  if (!isMe) return null;

  const statusMap = {
    sending: <Clock className="w-3 h-3 text-gray-400" />,
    sent: <Check className="w-3 h-3 text-gray-400" />,
    delivered: <CheckCheck className="w-3 h-3 text-gray-400" />,
    seen: <CheckCheck className="w-3 h-3 text-blue-500" />,
  };

  return statusMap[status] || null;
};

// Time separator
const TimeSeparator = ({ date }) => {
  if (!date) return null;
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return null;
    
    return (
      <div className="flex items-center gap-3 my-4 px-4">
        <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-700" />
        <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
          {dateObj.toLocaleDateString([], { 
            month: 'short', 
            day: 'numeric',
            year: dateObj.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
          })}
        </span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-700" />
      </div>
    );
  } catch (e) {
    console.error("Date parsing error:", e);
    return null;
  }
};

// Typing indicator
const TypingIndicator = () => (
  <div className="flex items-end gap-1.5 p-3 bg-white dark:bg-zinc-800 rounded-3xl w-fit">
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 0.6, repeat: Infinity }}
      className="w-2.5 h-2.5 bg-gray-400 rounded-full"
    />
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 0.6, repeat: Infinity, delay: 0.1 }}
      className="w-2.5 h-2.5 bg-gray-400 rounded-full"
    />
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
      className="w-2.5 h-2.5 bg-gray-400 rounded-full"
    />
  </div>
);

// Message bubble
const MessageBubble = ({ message, isMe, showTime, isGrouped }) => {
  if (!message) return null;

  const displayTime = message.createdAt 
    ? new Date(message.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-2 items-end mb-1 ${isMe ? "justify-end" : "justify-start"}`}
    >
      {!isMe && !isGrouped && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-agri-green/30 to-agri-green/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-agri-green">
          {message.senderName?.charAt(0) || "?"}
        </div>
      )}
      {!isMe && isGrouped && <div className="w-7" />}

      <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} gap-0.5 max-w-xs`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
            isMe
              ? "bg-agri-green text-white rounded-br-none shadow-md shadow-agri-green/20"
              : "bg-white dark:bg-zinc-800 text-current border border-gray-200 dark:border-zinc-700 rounded-bl-none"
          }`}
        >
          {message.content || "(empty message)"}
        </div>

        {showTime && displayTime && (
          <span className={`text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 mt-0.5 ${
            isMe ? "text-right" : "text-left"
          }`}>
            {displayTime}
          </span>
        )}

        {isMe && <MessageStatus status={message.status || "delivered"} isMe={isMe} />}
      </div>
    </motion.div>
  );
};

// Message group (multiple messages from same person)
const MessageGroup = ({ messages, isMe, showSeparator }) => {
  if (!Array.isArray(messages) || messages.length === 0) return null;

  const firstMsg = messages[0];
  if (!firstMsg) return null;

  return (
    <>
      {showSeparator && <TimeSeparator date={firstMsg.createdAt} />}
      <div className={`flex flex-col gap-0.5 mb-4 ${isMe ? "items-end" : "items-start"}`}>
        {!isMe && firstMsg.senderName && (
          <p className="text-xs font-bold text-gray-600 dark:text-gray-400 px-4 mb-1">
            {firstMsg.senderName}
          </p>
        )}
        {messages.map((msg, idx) => (
          <MessageBubble
            key={msg.id || `msg-${idx}`}
            message={msg}
            isMe={isMe}
            showTime={idx === messages.length - 1}
            isGrouped={idx > 0}
          />
        ))}
      </div>
    </>
  );
};

export default function ChatBubbles({
  messages = [],
  currentUserId,
  isTyping = false,
  otherPersonName = "Other Person",
}) {
  const scrollRef = useRef(null);
  const [groupedMessages, setGroupedMessages] = useState([]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 100);
    }
  }, [messages, isTyping]);

  // Group consecutive messages from same person
  useEffect(() => {
    try {
      if (!Array.isArray(messages)) {
        setGroupedMessages([]);
        return;
      }

      const groups = [];
      let currentGroup = [];
      let lastSenderId = null;
      let lastDate = null;

      messages.forEach((msg, idx) => {
        if (!msg || typeof msg !== 'object') return;

        const msgDate = msg.createdAt 
          ? new Date(msg.createdAt).toDateString() 
          : new Date().toDateString();
        const showSeparator = lastDate && lastDate !== msgDate;

        if (msg.senderId === lastSenderId && !showSeparator) {
          currentGroup.push(msg);
        } else {
          if (currentGroup.length > 0) {
            groups.push({
              isMe: lastSenderId === currentUserId,
              messages: currentGroup,
              showSeparator: lastDate && lastDate !== msgDate,
            });
          }
          currentGroup = [msg];
          lastSenderId = msg.senderId;
          lastDate = msgDate;
        }
      });

      if (currentGroup.length > 0) {
        groups.push({
          isMe: lastSenderId === currentUserId,
          messages: currentGroup,
          showSeparator: false,
        });
      }

      setGroupedMessages(groups);
    } catch (e) {
      console.error("Message grouping error:", e);
      setGroupedMessages([]);
    }
  }, [messages, currentUserId]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto space-y-2 py-4 px-4 bg-gradient-to-b from-white/60 to-white dark:from-zinc-900/40 dark:to-zinc-950 scroll-smooth"
    >
      {!Array.isArray(groupedMessages) || groupedMessages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-gray-400">
          <p className="text-sm font-semibold">No messages yet</p>
          <p className="text-xs">Start a conversation with {otherPersonName || "them"}</p>
        </div>
      ) : (
        <>
          <AnimatePresence>
            {groupedMessages.map((group, idx) => {
              if (!group || !Array.isArray(group.messages)) return null;
              return (
                <MessageGroup
                  key={`group-${idx}`}
                  messages={group.messages}
                  isMe={group.isMe}
                  showSeparator={group.showSeparator}
                />
              );
            })}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-2 items-end mb-4"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-agri-green/30 to-agri-green/10 flex items-center justify-center text-xs font-bold text-agri-green">
                {otherPersonName?.charAt(0) || "?"}
              </div>
              <TypingIndicator />
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
