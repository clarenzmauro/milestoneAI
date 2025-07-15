import React from 'react';
import { ChatMessage } from '../../types/chatTypes'; 
import styles from './ConversationUI.module.css';
import ReactMarkdown from 'react-markdown';

interface ConversationUIProps {
  messages: ChatMessage[];
}

const ConversationUI: React.FC<ConversationUIProps> = ({ messages }) => {
  return (
    <div className={styles.chatContainer}>
      {messages.map((msg: ChatMessage) => (
        <div
          key={msg.id}
          className={`${styles.messageBubble} ${styles[msg.role] || styles.defaultRole}`}>
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

export default ConversationUI;
