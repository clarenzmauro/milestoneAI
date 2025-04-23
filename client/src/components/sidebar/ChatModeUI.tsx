import React from 'react';
import { ChatMessage } from '../../types/chatTypes'; 
import styles from './ChatModeUI.module.css';
import ReactMarkdown from 'react-markdown';

interface ChatModeUIProps {
  messages: ChatMessage[];
}

const ChatModeUI: React.FC<ChatModeUIProps> = ({ messages }) => {
  return (
    <div className={styles.chatContainer}>
      {messages.map((msg: ChatMessage) => (
        <div
          key={msg.id}
          className={`${styles.messageBubble} ${styles[msg.role]}`}>
          <ReactMarkdown
            components={{
              ul: ({node, ...props}) => <ul className={styles.markdownList} {...props} />,
              li: ({node, ...props}) => <li className={styles.markdownListItem} {...props} />,
              pre: ({node, ...props}) => <pre className={styles.markdownPre} {...props} />,
            }}
          >
            {msg.text}
          </ReactMarkdown>
        </div>
      ))}
    </div>
  );
};

export default ChatModeUI;
