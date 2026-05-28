"use client";

import React from "react";
import ChatBubbles from "./ChatBubbles";

export default function ChatContainer({ 
  messages = [], 
  currentUserId, 
  otherPersonName,
  isTyping = false 
}) {
  // This wrapper ensures ChatBubbles only renders on client-side
  return (
    <ChatBubbles
      messages={messages}
      currentUserId={currentUserId}
      isTyping={isTyping}
      otherPersonName={otherPersonName}
    />
  );
}
