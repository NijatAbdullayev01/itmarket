import { IconChat } from "./icons";

export function ChatBubble() {
  return (
    <a
      className="ui-chat-bubble"
      href="tel:+994125555555"
      aria-label="Dəstək xətti: *5555"
      title="Bizimlə əlaqə"
    >
      <IconChat width={24} height={24} />
    </a>
  );
}
