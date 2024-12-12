import './createPost.js';

import { Devvit, useState } from '@devvit/public-api';
import { Welcome } from "./Welcome.js"

// Defines the messages that are exchanged between Devvit and Web View
type WebViewMessage =
  | {
  type: 'initialData';
  data: { username: string; currentCounter: number };
}
  | {
  type: 'setCounter';
  data: { newCounter: number };
}
  | {
  type: 'updateCounter';
  data: { currentCounter: number };
};

Devvit.configure({
  redditAPI: true,
  redis: true,
});

Devvit.addSchedulerJob({
  name: 'new-day', // you can use an arbitrary name here
  onRun: async (event, context) => {
    // do stuff when the job is executed
  },
});

// Add a custom post type to Devvit
Devvit.addCustomPostType({
  name: "Pirate's Parley",
  height: 'tall',
  render: (context) => {
    
    // Load username with `useAsync` hook
    const [username] = useState(async () => {
      const currUser = await context.reddit.getCurrentUser();
      return currUser?.username ?? 'anon';
    });
    
    // Load latest counter from redis with `useAsync` hook
    const [counter, setCounter] = useState(async () => {
      const redisCount = await context.redis.get(`counter_${context.postId}`);
      return Number(redisCount ?? 0);
    });
    
    const [webviewVisible, setWebviewVisible] = useState(false);
    
    // When the web view invokes `window.parent.postMessage` this function is called
    const onMessage = async (msg: WebViewMessage) => {
      switch (msg.type) {
        case 'setCounter':
          console.log("set counter message")
          await context.redis.set(`counter_${context.postId}`, msg.data.newCounter.toString());
          context.ui.webView.postMessage('myWebView', {
            type: 'updateCounter',
            data: {
              currentCounter: msg.data.newCounter,
            },
          });
          setCounter(msg.data.newCounter);
          break;
        case 'initialData':
        case 'updateCounter':
          console.log("update counter message received")
          break;
        
        default:
          throw new Error(`Unknown message type: ${msg satisfies never}`);
      }
    };
    
    // When the button is clicked, send initial data to web view and show it
    const onShowWebviewClick = () => {
      setWebviewVisible(true);
      context.ui.webView.postMessage('myWebView', {
        type: 'initialData',
        data: {
          username: username,
          currentCounter: counter,
        },
      });
    };
    
    // Render the custom post type
    return (
      <vstack grow padding="small">
        <Welcome
          webviewVisible={webviewVisible}
          counter={counter}
          username={username}
          onShowWebviewClick={onShowWebviewClick}
        />
        <vstack grow={webviewVisible} height={webviewVisible ? '100%' : '0%'}>
          <vstack border="thick" borderColor="black" height={webviewVisible ? '100%' : '0%'}>
            <webview
              id="myWebView"
              url="page.html"
              onMessage={(msg) => onMessage(msg as WebViewMessage)}
              grow
              height={webviewVisible ? '100%' : '0%'}
            />
          </vstack>
        </vstack>
      </vstack>
    );
  },
});

export default Devvit;
