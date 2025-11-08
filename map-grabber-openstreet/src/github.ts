// src/github.ts
import { Octokit } from "octokit";
const owner = process.env.GITHUB_OWNER!;
const repo = process.env.GITHUB_REPO!;
const branch = process.env.GITHUB_BRANCH || "main";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export async function getFileShaIfExists(path: string) {
  try {
    const { data } = await octokit.rest.repos.getContent({ owner, repo, path, ref: branch });
    // @ts-ignore
    return data.sha as string;
  } catch {
    return undefined;
  }
}

export async function ensureUniqueFolder(baseFolder: string) {
  // try suffixes _001, _002, … until folder is "new"
  for (let i = 1; i < 10000; i++) {
    const candidate = `${baseFolder}_${String(i).padStart(3, "0")}`;
    const path = `photos/${candidate}/.keep`;
    const sha = await getFileShaIfExists(path);
    if (!sha) {
      // create a tiny placeholder to "reserve" the folder
      await upsertFile(path, Buffer.from(""), `chore: reserve ${candidate}`);
      return candidate;
    }
  }
  throw new Error("Too many folders with same base");
}

export async function upsertFile(path: string, content: Buffer, message: string) {
  const sha = await getFileShaIfExists(path);
  const encoded = content.toString("base64");
  await octokit.rest.repos.createOrUpdateFileContents({
    owner, repo, path, message, content: encoded, branch, sha,
  });
}
