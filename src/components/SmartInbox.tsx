
import React from "react";
import SmartInboxWithAILearning from "./inbox/SmartInboxWithAILearning";

interface SmartInboxProps {
  user: {
    role: string;
    id: string;
  };
}

const SmartInbox = ({ user }: SmartInboxProps) => {
  return <SmartInboxWithAILearning user={user} />;
};

export default SmartInbox;
