import {
  Button,
  List,
  Navigation,
  NavigationStack,
  Section,
  Text,
  TextField,
  useEffect,
  useObservable,
} from "scripting";
import { github } from "../util/github";

export function View() {
  const dismiss = Navigation.useDismiss();
  return (
    <NavigationStack>
      <StackView
        navigationTitle={"设置"}
        toolbar={{
          topBarLeading: [<Button title={"关闭"} systemImage={"xmark"} action={dismiss} />],
          topBarTrailing: [
            <Button
              title={"保存"}
              systemImage={"checkmark"}
              action={() => {
                github.save();
                dismiss();
              }}
            />,
          ],
        }}
      />
    </NavigationStack>
  );
}

function StackView() {
  return (
    <List>
      <Section title={"GitHub"}>
        <ItemView key={"OWNER"} title={"所有者"} field={"OWNER"} />
        <ItemView key={"REPO"} title={"仓库"} field={"REPO"} />
        <ItemView key={"PATH"} title={"路径（默认根目录）"} field={"PATH"} />
      </Section>
    </List>
  );
}

function ItemView({ title, field }: { title: string; field: "OWNER" | "REPO" | "PATH" }) {
  const value = useObservable(github[field]);

  useEffect(() => {
    github[field] = value.value;
  }, [value.value]);

  return <TextField title={title} value={value} />;
}
