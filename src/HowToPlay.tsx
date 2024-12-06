import { Devvit } from "@devvit/public-api";

export const HowToPlay = ({ webviewVisible, counter, username, onShowWebviewClick }) => {
  return <vstack
    grow={!webviewVisible}
    height={webviewVisible ? '0%' : '100%'}
    alignment="middle center"
  >
    <text size="xlarge" weight="bold">
      Example App
    </text>
    <spacer/>
    <vstack alignment="start middle">
      <hstack>
        <text size="medium">Username:</text>
        <text size="medium" weight="bold">
          {' '}
          {username ?? ''}
        </text>
      </hstack>
      <hstack>
        <text size="medium">Current counter:</text>
        <text size="medium" weight="bold">
          {' '}
          {counter ?? ''}
        </text>
      </hstack>
    </vstack>
    <spacer/>
    <button onPress={onShowWebviewClick}>Launch App</button>
  </vstack>
}