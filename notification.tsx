import { HStack, Image, Notification, Text, VStack } from "scripting"

function NotificationView() {

  return <VStack
    frame={{
      height: 300
    }}
  >
    <Text
      font="headline"
    >Title</Text>
    <HStack>
      <Image
        systemName="globe"
        resizable
        scaleToFit
        frame={{
          width: 32,
          height: 32
        }}
        foregroundStyle="accentColor"
      />
      <Text>A custom notification content</Text>
    </HStack>
  </VStack>
}

Notification.present(
  <NotificationView />
)