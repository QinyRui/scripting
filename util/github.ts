import { fetch } from "scripting";

class GitHubAPI {
  private KEY = "setting";
  Local_Path = ""; // 本地文件路径

  OWNER = "";
  REPO = "";
  PATH = "";

  constructor() {
    Object.assign(this, Storage.get(this.KEY));
  }

  save() {
    const { KEY, Local_Path, ...data } = this;
    Storage.set(this.KEY, data);
  }

  getShareURL() {
    const sourceUrl = `https://github.com/${this.OWNER}/${this.REPO}/raw/refs/heads/main/${this.PATH}`;
    return "https://scripting.fun/import_scripts?urls=" + encodeURIComponent(`["${sourceUrl}"]`);
  }

  getImportSeheme() {
    const sourceUrl = `https://github.com/${this.OWNER}/${this.REPO}/raw/refs/heads/main/${this.PATH}`;
    return "scripting://import_scripts?urls=" + encodeURIComponent(`["${sourceUrl}"]`);
  }

  async upload(path: string, data: Data) {
    this.PATH = path;
    try {
      await GitHub.putContent({
        owner: this.OWNER,
        repo: this.REPO,
        path: this.PATH,
        message: "Update: " + this.PATH,
        content: data,
      });
    } catch (e) {
      // @ts-ignore
      const { sha } = await GitHub.getContent({
        owner: this.OWNER,
        repo: this.REPO,
        path: this.PATH,
      });
      await GitHub.putContent({
        owner: this.OWNER,
        repo: this.REPO,
        path: this.PATH,
        message: "Update: " + this.PATH,
        content: data,
        sha: sha,
      });
    }
  }
}

export const github = new GitHubAPI();
