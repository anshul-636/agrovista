"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCheck, Check, Clock } from "lucide-react";

// Message status indicator styled like WhatsApp
const MessageStatus = ({ status, isMe }) => {
  if (!isMe) return null;

  const statusMap = {
    sending: <Clock className="w-3 h-3 text-gray-500/80 dark:text-gray-400" />,
    sent: <Check className="w-3 h-3 text-gray-500/80 dark:text-gray-400" />,
    delivered: <CheckCheck className="w-3 h-3 text-gray-500/80 dark:text-gray-400" />,
    seen: <CheckCheck className="w-3 h-3 text-[#53bdeb]" />,
  };

  return <div className="ml-1 inline-flex items-center">{statusMap[status] || null}</div>;
};

// Time separator
const TimeSeparator = ({ date }) => {
  if (!date) return null;
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return null;
    
    return (
      <div className="flex justify-center my-4 relative z-10">
        <div className="bg-[#ffffff] dark:bg-[#182229] shadow-sm rounded-lg px-3 py-1.5 flex items-center justify-center border border-gray-100 dark:border-zinc-800">
          <span className="text-[11px] text-[#54656f] dark:text-[#8696a0] font-medium uppercase tracking-wide">
            {dateObj.toLocaleDateString([], { 
              month: 'long', 
              day: 'numeric',
              year: dateObj.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
            })}
          </span>
        </div>
      </div>
    );
  } catch (e) {
    console.error("Date parsing error:", e);
    return null;
  }
};

// Typing indicator
const TypingIndicator = () => (
  <div className="flex items-center gap-1 p-2 h-full">
    <motion.div
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 0.6, repeat: Infinity }}
      className="w-1.5 h-1.5 bg-[#8696a0] rounded-full"
    />
    <motion.div
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
      className="w-1.5 h-1.5 bg-[#8696a0] rounded-full"
    />
    <motion.div
      animate={{ y: [0, -3, 0] }}
      transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
      className="w-1.5 h-1.5 bg-[#8696a0] rounded-full"
    />
  </div>
);

// Message bubble
const MessageBubble = ({ message, isMe, showTime, isTopInGroup, isGrouped }) => {
  const [lightbox, setLightbox] = useState(false);
  if (!message) return null;

  const displayTime = message.createdAt 
    ? new Date(message.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const statusMap = {
    sending: "sent",
    sent: "sent",
    read: "seen",
    failed: "sent"
  };

  return (
    <>
      {lightbox && message.imageUrl && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <img
            src={message.imageUrl}
            alt="Full size"
            className="max-h-[90vh] max-w-[90vw] rounded-2xl shadow-2xl object-contain"
          />
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 text-white text-2xl font-bold hover:text-gray-300"
          >
            ×
          </button>
        </div>
      )}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, transformOrigin: isMe ? "right bottom" : "left bottom" }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className={`flex flex-col relative w-full mb-1 group px-2 sm:px-4 ${isMe ? "items-end" : "items-start"}`}
      >
        <div 
          className={`relative max-w-[85%] sm:max-w-[70%] pb-1 pt-1.5 px-3 text-[14.5px] leading-relaxed break-words shadow-sm ${
            isMe
              ? `bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] ${isTopInGroup ? 'rounded-l-lg rounded-br-lg rounded-tr-none' : 'rounded-lg'}`
              : `bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] ${isTopInGroup ? 'rounded-r-lg rounded-bl-lg rounded-tl-none' : 'rounded-lg'}`
          } ${message.status === 'failed' ? 'opacity-60 ring-1 ring-red-400' : ''}`}
        >
          {isTopInGroup && (
            <svg viewBox="0 0 8 13" height="13" width="8" className={`absolute top-0 w-2 h-3.5 fill-current ${
              isMe ? "text-[#d9fdd3] dark:text-[#005c4b] -right-2 right-tail" : "text-white dark:text-[#202c33] -left-2 scale-x-[-1] left-tail"
            }`}>
              <path opacity="0.13" d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z"></path>
              <path fill="currentColor" d="M5.188 0H0v11.193l6.467-8.625C7.526 1.156 6.958 0 5.188 0z"></path>
            </svg>
          )}

          {!isMe && isTopInGroup && message.senderName && (
            <div className="text-[13px] font-bold text-[#eb5528] dark:text-[#6bcbab] mb-0.5 tracking-tight flex items-center justify-between gap-4">
              <span>{message.senderName}</span>
              <span className="text-[10px] font-medium text-[#54656f] dark:text-[#8696a0] opacity-0 group-hover:opacity-100 transition">{message.senderRole || "FARMER"}</span>
            </div>
          )}

          {/* Image attachment */}
          {message.imageUrl && (
            <div className="mb-1.5 mt-0.5 -mx-1">
              <img
                src={message.imageUrl}
                alt="Attachment"
                className="rounded-xl max-h-64 w-full object-cover cursor-pointer hover:opacity-90 transition"
                onClick={() => setLightbox(true)}
              />
            </div>
          )}

          <div className="flex min-w-[50px] relative">
            <span className="inline-block flex-1 mr-8 align-middle">
              {message.content || (message.imageUrl ? "" : "(empty message)")}
            </span>
            
            <div className="absolute right-0 bottom-[-4px] flex items-center ml-2 h-full justify-end" style={{ alignSelf: 'flex-end', clear: 'both' }}>
              {message.status === 'failed' && (
                <span className="text-[10px] text-red-500 mr-1">!</span>
              )}
              <span className="text-[10.5px] whitespace-nowrap text-[#667781] dark:text-[#8696a0] pt-1">
                {displayTime}
              </span>
              <MessageStatus status={statusMap[message.status] || "read"} isMe={isMe} />
            </div>
          </div>
        </div>
      </motion.div>
    </>
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
      <div className="mb-0.5 flex flex-col w-full">
        {messages.map((msg, idx) => (
          <MessageBubble
            key={msg.id || `msg-${idx}`}
            message={msg}
            isMe={isMe}
            showTime={true}
            isTopInGroup={idx === 0}
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

      messages.forEach((msg) => {
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
      className="flex-1 overflow-y-auto space-y-1.5 py-4 bg-[#efeae2] dark:bg-[#0b141a] scroll-smooth w-full relative"
    >
      {/* WhatsApp standard light abstract doodle background via CSS */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.4] dark:opacity-5 pointer-events-none mix-blend-multiply dark:mix-blend-overlay"
        style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: '400px' }}
      />
      
      <div className="relative z-10 h-full flex flex-col">
        {!Array.isArray(groupedMessages) || groupedMessages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="bg-[#ffeecd] dark:bg-[#182229] px-4 py-2 rounded-xl text-center shadow-sm border border-yellow-200/50 dark:border-zinc-800 text-[12px] text-[#54656f] dark:text-[#8696a0] max-w-sm">
              <span className="block mb-1">🔒 Messages and calls are end-to-end encrypted. No one outside of this chat, not even AgroVista, can read or listen to them.</span>
              Start a highly secure conversation with {otherPersonName || "them"}.
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col flex-1 justify-end min-h-min pb-2">
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
                <div className="flex gap-2 items-end mt-1 mb-2 px-2 sm:px-4 relative z-10 w-full justify-start items-start">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, transformOrigin: 'left bottom' }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white dark:bg-[#202c33] px-3.5 py-2.5 rounded-2xl rounded-tl-none shadow-sm flex items-center justify-center border border-gray-100 dark:border-zinc-800"
                  >
                    <TypingIndicator />
                  </motion.div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
