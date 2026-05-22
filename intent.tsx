import {
  Button,
  List,
  Path,
  Text,
  NavigationStack,
  Navigation,
  Section,
  HStack,
  Image,
  useState,
  useEffect,
  ProgressView,
  Spacer,
} from "scripting";
import { github } from "../util/github";

let openUrl = "";
export function View() {
  const dismiss = Navigation.useDismiss();
  return (
    <NavigationStack>
      <StackView
        navigationTitle={"生成分享链接"}
        toolbar={{
          topBarLeading: [<Button title={"关闭"} systemImage={"xmark"} action={dismiss} />],
          topBarTrailing: [
            <Button
              title={"打开仓库"}
              systemImage={"safari"}
              action={() => Safari.openURL(`https://github.com/${github.OWNER}/${github.REPO}`)}
            />,
          ],
        }}
      />
    </NavigationStack>
  );
}

function StackView() {
  const [isLoading, setIsLoading] = useState<boolean | null>(true);

  async function run() {
    try {
      const data = await FileManager.readAsData(github.Local_Path);
      await github.upload(Path.join(github.PATH, Path.basename(github.Local_Path)), data);
      openUrl = github.getShareURL();
      setIsLoading(false);
    } catch (e) {
      Dialog.alert({
        message: String(e),
      });
      setIsLoading(null);
    }
  }

  useEffect(() => {
    run();
  }, []);

  return (
    <List refreshable={isLoading === null ? () => run() : undefined}>
      <Section
        header={
          <HStack>
            <Text>{"分享链接"}</Text>
            <Spacer />
            <CopyButton content={openUrl} />
          </HStack>
        }>
        {isLoading === null ? (
          <Text foregroundStyle={"secondaryLabel"}>{"脚本上传失败"}</Text>
        ) : isLoading ? (
          <HStack>
            <ProgressView />
            <Text foregroundStyle={"secondaryLabel"}>{"正在上传脚本"}</Text>
          </HStack>
        ) : (
          <Button action={() => Safari.openURL(github.getImportSeheme())}>
            <Text>{openUrl}</Text>
          </Button>
        )}
      </Section>
    </List>
  );
}

function CopyButton({ content }: { content: string }) {
  const [isCopied, setIsCopied] = useState(false);
  return (
    <Button
      frame={{ height: 2 }}
      contentTransition={"symbolEffect"}
      action={async () => {
        setIsCopied(true);
        await Pasteboard.setString(content);
        setTimeout(() => {
          setIsCopied(false);
        }, 800);
      }}>
      <Image systemName={isCopied ? "checkmark" : "doc.on.doc"} />
    </Button>
  );
}
